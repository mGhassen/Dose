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

  for (const l of lines) {
    if (!l.itemId || l.quantity <= 0) continue;
    const [itemResult, recipeResult] = await Promise.all([
      supabase.from("items").select("id, unit, produced_from_recipe_id").eq("id", l.itemId).single(),
      supabase.from("recipes").select("id, unit").eq("id", l.itemId).single(),
    ]);
    if (itemResult.data) {
      const targetItemId = itemResult.data.id;
      const unit = itemResult.data.unit || "unit";
      const { error: outError } = await supabase.from("stock_movements").insert({
        item_id: targetItemId,
        movement_type: StockMovementType.OUT,
        quantity: l.quantity,
        unit,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleId,
        movement_date: movementDate,
        notes: `Sale #${saleId}`,
      });
      if (outError) {
        await supabase
          .from("stock_movements")
          .delete()
          .eq("reference_type", StockMovementReferenceType.SALE)
          .eq("reference_id", saleId);
        return { ok: false, message: outError.message };
      }
    } else if (recipeResult.data) {
      const { data: producedItem } = await supabase
        .from("items")
        .select("id, unit")
        .eq("produced_from_recipe_id", l.itemId)
        .single();
      let producedItemId: number;
      let producedItemUnit: string;
      if (!producedItem) {
        const result = await produceRecipe(supabase, String(l.itemId), {
          quantity: l.quantity,
          location: null,
          notes: `Sale #${saleId}`,
        });
        producedItemId = result.producedItemId;
        producedItemUnit = recipeResult.data.unit || "unit";
      } else {
        producedItemId = producedItem.id;
        producedItemUnit = producedItem.unit || "unit";
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
        unit: producedItemUnit,
        reference_type: StockMovementReferenceType.SALE,
        reference_id: saleId,
        movement_date: movementDate,
        notes: `Sale #${saleId}`,
      });
      if (recipeMoveErr) {
        await supabase
          .from("stock_movements")
          .delete()
          .eq("reference_type", StockMovementReferenceType.SALE)
          .eq("reference_id", saleId);
        return { ok: false, message: recipeMoveErr.message };
      }
    }
  }
  return { ok: true };
}
