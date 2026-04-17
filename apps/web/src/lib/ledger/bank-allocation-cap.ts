import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures new allocations against a bank line do not exceed |bank_transactions.amount|.
 */
export async function assertBankAllocationWithinCap(
  supabase: SupabaseClient,
  bankTransactionId: number,
  additionalAmount: number,
  excludePaymentId?: number
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { data: bt, error: btErr } = await supabase
    .from("bank_transactions")
    .select("amount")
    .eq("id", bankTransactionId)
    .single();
  if (btErr || !bt) {
    return { ok: false, status: 404, message: "Bank transaction not found" };
  }
  const { data: slices, error: sumErr } = await supabase
    .from("payments")
    .select("id, amount")
    .eq("bank_transaction_id", bankTransactionId);
  if (sumErr) throw sumErr;
  let sumExisting = 0;
  for (const r of slices || []) {
    if (excludePaymentId != null && Number((r as { id: number }).id) === excludePaymentId) continue;
    sumExisting += parseFloat(String((r as { amount: string | number }).amount));
  }
  const cap = Math.abs(parseFloat(String(bt.amount)));
  const total = sumExisting + additionalAmount;
  if (total > cap + 0.005) {
    return {
      ok: false,
      status: 400,
      message: `Allocations for this bank line exceed its amount (cap ${cap.toFixed(2)}, already ${sumExisting.toFixed(2)})`,
    };
  }
  return { ok: true };
}
