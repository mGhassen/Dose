import type { SupabaseClient } from "@supabase/supabase-js";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";
import { getItemStock } from "@/lib/stock/get-item-stock";
import { produceRecipe } from "@/lib/stock/produce-recipe";

export type SaleStockLine = {
  itemId?: number;
  quantity: number;
};

/**
 * Deletes sale-sourced movements then rewrites OUT rows from resolved sale lines
 * (same semantics as create sale transaction).
 */
export async function replaceSaleStockMovements(
  supabase: SupabaseClient,
  params: {
    saleId: number;
    movementDate: string;
    lines: SaleStockLine[];
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { saleId, movementDate, lines } = params;

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

  for (const l of lines) {
    if (!l.itemId || l.quantity <= 0) continue;
    const [itemResult, recipeResult] = await Promise.all([
      supabase
        .from("items")
        .select("id, unit_id, produced_from_recipe_id")
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

    if (itemResult.data) {
      const { error: outError } = await supabase.from("stock_movements").insert({
        item_id: itemResult.data.id,
        movement_type: StockMovementType.OUT,
        quantity: l.quantity,
        unit: "unit",
        unit_id: itemResult.data.unit_id ?? null,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleId,
        movement_date: movementDate,
        notes: `Sale #${saleId}`,
      });
      if (outError) {
        await rollback();
        return { ok: false, message: outError.message };
      }
    } else if (recipeResult.data) {
      const { data: producedItem, error: producedErr } = await supabase
        .from("items")
        .select("id, unit_id")
        .eq("produced_from_recipe_id", l.itemId)
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
        producedItemUnitId = recipeResult.data.unit_id ?? null;
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
  }
  return { ok: true };
}
