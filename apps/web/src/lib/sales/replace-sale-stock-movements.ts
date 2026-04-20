import type { SupabaseClient } from "@supabase/supabase-js";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";
import { getItemStock } from "@/lib/stock/get-item-stock";
import { produceRecipe } from "@/lib/stock/produce-recipe";
import { ensureRecipeForProduceOnSaleProduct } from "@/lib/recipes/ensure-recipe-for-produce-on-sale-product";
import {
  convertQuantityWithContext,
  logUnitConversionWarning,
} from "@/lib/units/convert";
import { loadUnitConversionContext } from "@/lib/units/context";

export type SaleStockLine = {
  itemId?: number;
  quantity: number;
  unitId?: number;
};

export type PreloadedItem = {
  id: number;
  unit_id: number | null;
  unit?: string | null;
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

/** Sale OUT rows use this instant; recipe production uses one minute earlier. */
function resolveSaleMovementInstant(movementDate: string): string {
  const s = movementDate.trim();
  if (!s) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function instantOneMinuteBefore(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return new Date(Date.now() - 60_000).toISOString();
  return new Date(t - 60_000).toISOString();
}

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
  const saleInstant = resolveSaleMovementInstant(movementDate);
  const productionInstant = instantOneMinuteBefore(saleInstant);
  const conversionContext = await loadUnitConversionContext(supabase);

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
  const recipeBackedProductLines: { line: SaleStockLine; item: PreloadedItem; recipe: PreloadedRecipe }[] = [];

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
          .select("id, unit_id, unit, produced_from_recipe_id, affects_stock, produce_on_sale")
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
          .select("id, unit_id, unit, produced_from_recipe_id, affects_stock, produce_on_sale")
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
        recipeBackedProductLines.push({ line: l, item: effectiveItem, recipe: resolved.recipe });
        continue;
      }

      let quantityInItemUnit = l.quantity;
      const sourceUnitId = l.unitId ?? effectiveItem.unit_id ?? null;
      if (effectiveItem.unit_id != null && sourceUnitId != null) {
        const quantityResult = convertQuantityWithContext(
          l.quantity,
          sourceUnitId,
          effectiveItem.unit_id,
          conversionContext
        );
        quantityInItemUnit = quantityResult.quantity;
        if (quantityResult.warning) {
          logUnitConversionWarning("replace-sale-stock-movements:direct-out", quantityResult.warning);
        }
      }

      directOutRows.push({
        item_id: effectiveItem.id,
        movement_type: StockMovementType.OUT,
        quantity: quantityInItemUnit,
        unit: effectiveItem.unit ?? "unit",
        unit_id: effectiveItem.unit_id ?? null,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleId,
        movement_date: saleInstant,
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

  for (const { line: l, item, recipe } of recipeBackedProductLines) {
    const recipeId = item.produced_from_recipe_id!;
    let requiredOutInItemUnit = l.quantity;
    const lineUnitId = l.unitId ?? item.unit_id ?? null;
    if (item.unit_id != null && lineUnitId != null) {
      const quantityResult = convertQuantityWithContext(
        l.quantity,
        lineUnitId,
        item.unit_id,
        conversionContext
      );
      requiredOutInItemUnit = quantityResult.quantity;
      if (quantityResult.warning) {
        logUnitConversionWarning("replace-sale-stock-movements:recipe-backed-out", quantityResult.warning);
      }
    }
    const stock = await getItemStock(supabase, item.id, null);
    if (stock < requiredOutInItemUnit) {
      let produceQuantity = requiredOutInItemUnit - stock;
      if (recipe.unit_id != null && item.unit_id != null) {
        const produceQuantityResult = convertQuantityWithContext(
          produceQuantity,
          item.unit_id,
          recipe.unit_id,
          conversionContext
        );
        produceQuantity = produceQuantityResult.quantity;
        if (produceQuantityResult.warning) {
          logUnitConversionWarning("replace-sale-stock-movements:recipe-production", produceQuantityResult.warning);
        }
      }
      const pr = await produceRecipe(supabase, String(recipeId), {
        quantity: produceQuantity,
        location: null,
        notes: `Sale #${saleId}`,
        producedItemId: item.id,
        movementDate: productionInstant,
      });
      if (pr.producedItemId !== item.id) {
        await rollback();
        return { ok: false, message: "Produced item mismatch for recipe-backed sale line" };
      }
    }
    const { error: recipeMoveErr } = await supabase.from("stock_movements").insert({
      item_id: item.id,
      movement_type: StockMovementType.OUT,
      quantity: requiredOutInItemUnit,
      unit: item.unit ?? "unit",
      unit_id: item.unit_id ?? null,
      reference_type: StockMovementReferenceType.SALE,
      reference_id: saleId,
      movement_date: saleInstant,
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
      .select("id, unit_id, unit")
      .eq("produced_from_recipe_id", l.itemId!)
      .maybeSingle();
    if (producedErr) {
      await rollback();
      return { ok: false, message: producedErr.message };
    }
    let producedItemId: number;
    let producedItemUnitId: number | null;
    let producedItemUnit: string | null = producedItem?.unit ?? null;
    if (!producedItem) {
      let produceQuantity = l.quantity;
      if (l.unitId != null && recipe.unit_id != null) {
        const produceQuantityResult = convertQuantityWithContext(
          l.quantity,
          l.unitId,
          recipe.unit_id,
          conversionContext
        );
        produceQuantity = produceQuantityResult.quantity;
        if (produceQuantityResult.warning) {
          logUnitConversionWarning("replace-sale-stock-movements:recipe-line-production", produceQuantityResult.warning);
        }
      }
      const result = await produceRecipe(supabase, String(l.itemId), {
        quantity: produceQuantity,
        location: null,
        notes: `Sale #${saleId}`,
        movementDate: productionInstant,
      });
      producedItemId = result.producedItemId;
      const { data: createdProducedItem, error: producedReloadErr } = await supabase
        .from("items")
        .select("id, unit_id, unit")
        .eq("id", producedItemId)
        .single();
      if (producedReloadErr || !createdProducedItem) {
        await rollback();
        return {
          ok: false,
          message: producedReloadErr?.message ?? "Failed to load produced item after recipe production",
        };
      }
      producedItemUnitId = createdProducedItem.unit_id ?? null;
      producedItemUnit = createdProducedItem.unit ?? null;
    } else {
      producedItemId = producedItem.id;
      producedItemUnitId = producedItem.unit_id ?? null;
      let requiredOutInItemUnit = l.quantity;
      const lineUnitId = l.unitId ?? producedItem.unit_id ?? null;
      if (lineUnitId != null && producedItem.unit_id != null) {
        const quantityResult = convertQuantityWithContext(
          l.quantity,
          lineUnitId,
          producedItem.unit_id,
          conversionContext
        );
        requiredOutInItemUnit = quantityResult.quantity;
        if (quantityResult.warning) {
          logUnitConversionWarning("replace-sale-stock-movements:recipe-line-out", quantityResult.warning);
        }
      }
      const stock = await getItemStock(supabase, producedItem.id, null);
      if (stock < requiredOutInItemUnit) {
        let produceQuantity = requiredOutInItemUnit - stock;
        if (producedItem.unit_id != null && recipe.unit_id != null) {
          const produceQuantityResult = convertQuantityWithContext(
            produceQuantity,
            producedItem.unit_id,
            recipe.unit_id,
            conversionContext
          );
          produceQuantity = produceQuantityResult.quantity;
          if (produceQuantityResult.warning) {
            logUnitConversionWarning("replace-sale-stock-movements:recipe-line-replenish", produceQuantityResult.warning);
          }
        }
        await produceRecipe(supabase, String(l.itemId), {
          quantity: produceQuantity,
          location: null,
          notes: `Sale #${saleId}`,
          movementDate: productionInstant,
        });
      }
    }
    let outQuantity = l.quantity;
    const outUnitId = l.unitId ?? producedItemUnitId ?? null;
    if (outUnitId != null && producedItemUnitId != null) {
      const quantityResult = convertQuantityWithContext(
        l.quantity,
        outUnitId,
        producedItemUnitId,
        conversionContext
      );
      outQuantity = quantityResult.quantity;
      if (quantityResult.warning) {
        logUnitConversionWarning("replace-sale-stock-movements:recipe-out-insert", quantityResult.warning);
      }
    }
    const { error: recipeMoveErr } = await supabase.from("stock_movements").insert({
      item_id: producedItemId,
      movement_type: StockMovementType.OUT,
      quantity: outQuantity,
      unit: producedItemUnit ?? "unit",
      unit_id: producedItemUnitId,
      reference_type: StockMovementReferenceType.SALE,
      reference_id: saleId,
      movement_date: saleInstant,
      notes: `Sale #${saleId}`,
    });
    if (recipeMoveErr) {
      await rollback();
      return { ok: false, message: recipeMoveErr.message };
    }
  }

  return { ok: true };
}
