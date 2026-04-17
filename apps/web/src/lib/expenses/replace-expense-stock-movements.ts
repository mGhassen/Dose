import type { SupabaseClient } from "@supabase/supabase-js";
import { StockMovementType, StockMovementReferenceType } from "@kit/types";

export type ExpenseStockLine = {
  itemId?: number;
  subscriptionId?: number;
  quantity: number;
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
  const unitMap = new Map<number, string>();
  if (ids.length > 0) {
    const { data: items, error: itemErr } = await supabase.from("items").select("id, unit").in("id", ids);
    if (itemErr) return { ok: false, message: itemErr.message };
    for (const row of items || []) unitMap.set(row.id, row.unit || "unit");
  }

  for (const l of itemLines) {
    const unit = unitMap.get(l.itemId!) ?? "unit";
    const { error: insErr } = await supabase.from("stock_movements").insert({
      item_id: l.itemId,
      movement_type: StockMovementType.IN,
      quantity: l.quantity,
      unit,
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
