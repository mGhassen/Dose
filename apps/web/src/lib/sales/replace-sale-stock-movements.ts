import type { SupabaseClient } from "@supabase/supabase-js";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";
import { getItemStock } from "@/lib/stock/get-item-stock";
import { produceRecipe } from "@/lib/stock/produce-recipe";
import { ensureRecipeForProduceOnSaleProduct } from "@/lib/recipes/ensure-recipe-for-produce-on-sale-product";

export type SaleStockLine = {
  itemId?: number;
  quantity: number;
};

export type PreloadedItem = {
  id: number;
  unit_id: number | null;
  produced_from_recipe_id: number | null;
  affects_stock: boolean | null;
  produce_on_sale: boolean | null;
};

export type PreloadedRecipe = {
  id: number;
  unit_id: number | null;
};

export type StockReplacePreload = {
  itemsById: Map<number, PreloadedItem>;
  recipesById: Map<number, PreloadedRecipe>;
};

async function resolveRecipeRow(
  supabase: SupabaseClient,
  recipeId: number,
  preload?: StockReplacePreload
): Promise<{ ok: true; recipe: PreloadedRecipe } | { ok: false; message: string }> {
  if (preload?.recipesById.has(recipeId)) {
    return { ok: true, recipe: preload.recipesById.get(recipeId)! };
  }
  const { data, error } = await supabase.from("recipes").select("id, unit_id").eq("id", recipeId).maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!data) return { ok: false, message: `Recipe ${recipeId} not found` };
  return { ok: true, recipe: data as PreloadedRecipe };
}

/**
 * Deletes sale-sourced movements then rewrites OUT rows from resolved sale lines
 * (same semantics as create sale transaction).
 *
 * When `preload` is provided, items/recipes lookups are served from memory and
 * most non-recipe OUT rows go out as a single bulk insert. Recipe-backed paths
 * call `produceRecipe` when needed (produce-on-sale catalog items get a linked recipe first).
 */
export async function replaceSaleStockMovements(
  supabase: SupabaseClient,
  params: {
    saleId: number;
    movementDate: string;
    lines: SaleStockLine[];
    preload?: StockReplacePreload;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { saleId, movementDate, lines, preload } = params;

  const { error: delErr } = await supabase
    .from("stock_movements")
    .delete()
    .eq("reference_type", StockMovementReferenceType.SALE)
    .eq("reference_id", saleId);
  if (delErr) return { ok: false, message: delErr.message };

  const rollback = async () => {
    await supabase
      .from("stock_movements")
      .delete()
      .eq("reference_type", StockMovementReferenceType.SALE)
      .eq("reference_id", saleId);
  };

  type MovementRow = {
    item_id: number;
    movement_type: StockMovementType;
    quantity: number;
    unit: string;
    unit_id: number | null;
    reference_type: StockMovementReferenceType;
    reference_id: number;
    movement_date: string;
    notes: string;
  };
  const directOutRows: MovementRow[] = [];
  const recipeLines: { line: SaleStockLine; recipe: PreloadedRecipe }[] = [];
  const recipeBackedProductLines: { line: SaleStockLine; item: PreloadedItem }[] = [];

  for (const l of lines) {
    if (!l.itemId || l.quantity <= 0) continue;

    let item: PreloadedItem | null = null;
    let recipe: PreloadedRecipe | null = null;

    if (preload) {
      item = preload.itemsById.get(l.itemId) ?? null;
      recipe = item ? null : preload.recipesById.get(l.itemId) ?? null;
    } else {
      const [itemResult, recipeResult] = await Promise.all([
        supabase
          .from("items")
          .select("id, unit_id, produced_from_recipe_id, affects_stock, produce_on_sale")
          .eq("id", l.itemId)
          .maybeSingle(),
        supabase.from("recipes").select("id, unit_id").eq("id", l.itemId).maybeSingle(),
      ]);
      if (itemResult.error) {
        await rollback();
        return { ok: false, message: itemResult.error.message };
      }
      if (recipeResult.error) {
        await rollback();
        return { ok: false, message: recipeResult.error.message };
      }
      item = (itemResult.data as PreloadedItem | null) ?? null;
      recipe = (recipeResult.data as PreloadedRecipe | null) ?? null;
    }

    if (item) {
      if (item.affects_stock === false) continue;

      let effectiveItem: PreloadedItem = item;
      if (item.produce_on_sale === true && item.produced_from_recipe_id == null) {
        const ens = await ensureRecipeForProduceOnSaleProduct(supabase, item.id);
        if (!ens.ok) {
          await rollback();
          return { ok: false, message: ens.message };
        }
        const { data: refreshed, error: refErr } = await supabase
          .from("items")
          .select("id, unit_id, produced_from_recipe_id, affects_stock, produce_on_sale")
          .eq("id", item.id)
          .single();
        if (refErr || !refreshed) {
          await rollback();
          return { ok: false, message: refErr?.message ?? "Failed to reload item after linking recipe" };
        }
        effectiveItem = refreshed as PreloadedItem;
        if (preload) {
          preload.itemsById.set(item.id, effectiveItem);
        }
      }

      if (effectiveItem.produced_from_recipe_id != null) {
        const resolved = await resolveRecipeRow(supabase, effectiveItem.produced_from_recipe_id, preload);
        if (!resolved.ok) {
          await rollback();
          return { ok: false, message: resolved.message };
        }
        recipeBackedProductLines.push({ line: l, item: effectiveItem });
        continue;
      }

      directOutRows.push({
        item_id: effectiveItem.id,
        movement_type: StockMovementType.OUT,
        quantity: l.quantity,
        unit: "unit",
        unit_id: effectiveItem.unit_id ?? null,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleId,
        movement_date: movementDate,
        notes: `Sale #${saleId}`,
      });
    } else if (recipe) {
      recipeLines.push({ line: l, recipe });
    }
  }

  if (directOutRows.length > 0) {
    const { error: outError } = await supabase.from("stock_movements").insert(directOutRows);
    if (outError) {
      await rollback();
      return { ok: false, message: outError.message };
    }
  }

  for (const { line: l, item } of recipeBackedProductLines) {
    const recipeId = item.produced_from_recipe_id!;
    const stock = await getItemStock(supabase, item.id, null);
    if (stock < l.quantity) {
      const pr = await produceRecipe(supabase, String(recipeId), {
        quantity: l.quantity - stock,
        location: null,
        notes: `Sale #${saleId}`,
        producedItemId: item.id,
      });
      if (pr.producedItemId !== item.id) {
        await rollback();
        return { ok: false, message: "Produced item mismatch for recipe-backed sale line" };
      }
    }
    const { error: recipeMoveErr } = await supabase.from("stock_movements").insert({
      item_id: item.id,
      movement_type: StockMovementType.OUT,
      quantity: l.quantity,
      unit: "unit",
      unit_id: item.unit_id ?? null,
      reference_type: StockMovementReferenceType.SALE,
      reference_id: saleId,
      movement_date: movementDate,
      notes: `Sale #${saleId}`,
    });
    if (recipeMoveErr) {
      await rollback();
      return { ok: false, message: recipeMoveErr.message };
    }
  }

  for (const { line: l, recipe } of recipeLines) {
    const { data: producedItem, error: producedErr } = await supabase
      .from("items")
      .select("id, unit_id")
      .eq("produced_from_recipe_id", l.itemId!)
      .maybeSingle();
    if (producedErr) {
      await rollback();
      return { ok: false, message: producedErr.message };
    }
    let producedItemId: number;
    let producedItemUnitId: number | null;
    if (!producedItem) {
      const result = await produceRecipe(supabase, String(l.itemId), {
        quantity: l.quantity,
        location: null,
        notes: `Sale #${saleId}`,
      });
      producedItemId = result.producedItemId;
      producedItemUnitId = recipe.unit_id ?? null;
    } else {
      producedItemId = producedItem.id;
      producedItemUnitId = producedItem.unit_id ?? null;
      const stock = await getItemStock(supabase, producedItem.id, null);
      if (stock < l.quantity) {
        await produceRecipe(supabase, String(l.itemId), {
          quantity: l.quantity - stock,
          location: null,
          notes: `Sale #${saleId}`,
        });
      }
    }
    const { error: recipeMoveErr } = await supabase.from("stock_movements").insert({
      item_id: producedItemId,
      movement_type: StockMovementType.OUT,
      quantity: l.quantity,
      unit: "unit",
      unit_id: producedItemUnitId,
      reference_type: StockMovementReferenceType.SALE,
      reference_id: saleId,
      movement_date: movementDate,
      notes: `Sale #${saleId}`,
    });
    if (recipeMoveErr) {
      await rollback();
      return { ok: false, message: recipeMoveErr.message };
    }
  }

  return { ok: true };
}
