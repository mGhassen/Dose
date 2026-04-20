import type { SupabaseClient } from "@supabase/supabase-js";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";
import {
  convertQuantityWithContext,
  logUnitConversionWarning,
} from "@/lib/units/convert";
import { loadUnitConversionContext } from "@/lib/units/context";

export type ExpenseStockLine = {
  itemId?: number;
  subscriptionId?: number;
  quantity: number;
  unitId?: number;
};

/**
 * Deletes all expense-sourced movements, then inserts IN rows only when the expense
 * is not linked to a supplier order (stock is owned by order receive in that case).
 */
export async function replaceExpenseStockMovements(
  supabase: SupabaseClient,
  params: {
    expenseId: number;
    supplierOrderId: number | null | undefined;
    lines: ExpenseStockLine[];
    movementDate: string;
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { expenseId, supplierOrderId, lines, movementDate } = params;
  const conversionContext = await loadUnitConversionContext(supabase);

  const { error: delErr } = await supabase
    .from("stock_movements")
    .delete()
    .eq("reference_type", StockMovementReferenceType.EXPENSE)
    .eq("reference_id", expenseId);
  if (delErr) return { ok: false, message: delErr.message };

  if (supplierOrderId != null) return { ok: true };

  const itemLines = lines.filter(
    (l) => l.itemId != null && l.quantity > 0 && l.subscriptionId == null
  );
  const ids = [...new Set(itemLines.map((l) => l.itemId!))];
  const itemUnitMap = new Map<number, { unitId: number | null; unit: string | null }>();
  if (ids.length > 0) {
    const { data: items, error: itemErr } = await supabase
      .from("items")
      .select("id, unit_id, unit")
      .in("id", ids);
    if (itemErr) return { ok: false, message: itemErr.message };
    for (const row of items || []) {
      itemUnitMap.set(row.id, { unitId: row.unit_id ?? null, unit: row.unit ?? null });
    }
  }

  for (const l of itemLines) {
    const itemUnit = itemUnitMap.get(l.itemId!);
    const unitId = itemUnit?.unitId ?? null;
    const sourceUnitId = l.unitId ?? unitId;
    let quantityInItemUnit = l.quantity;
    if (sourceUnitId != null && unitId != null) {
      const quantityResult = convertQuantityWithContext(
        l.quantity,
        sourceUnitId,
        unitId,
        conversionContext
      );
      quantityInItemUnit = quantityResult.quantity;
      if (quantityResult.warning) {
        logUnitConversionWarning("replace-expense-stock-movements", quantityResult.warning);
      }
    }
    const { error: insErr } = await supabase.from("stock_movements").insert({
      item_id: l.itemId,
      movement_type: StockMovementType.IN,
      quantity: quantityInItemUnit,
      unit: itemUnit?.unit ?? "unit",
      unit_id: unitId,
      reference_type: StockMovementReferenceType.EXPENSE,
      reference_id: expenseId,
      movement_date: movementDate,
      notes: `Expense #${expenseId}`,
    });
    if (insErr) {
      await supabase
        .from("stock_movements")
        .delete()
        .eq("reference_type", StockMovementReferenceType.EXPENSE)
        .eq("reference_id", expenseId);
      return { ok: false, message: insErr.message };
    }
  }
  return { ok: true };
}
