import type { SupabaseClient } from "@supabase/supabase-js";

export type EntryPaymentAggregate = {
  paymentCount: number;
  reconciledPaymentCount: number;
  totalPaidAmount: number;
};

function emptyAggregate(): EntryPaymentAggregate {
  return { paymentCount: 0, reconciledPaymentCount: 0, totalPaidAmount: 0 };
}

/** Ledger payments + bank allocation counts per expense or sale (reference_id). */
export async function getEntryPaymentAggregates(
  supabase: SupabaseClient,
  entryType: "expense" | "sale",
  referenceIds: number[]
): Promise<Map<number, EntryPaymentAggregate>> {
  const result = new Map<number, EntryPaymentAggregate>();
  if (referenceIds.length === 0) return result;

  const { data: entryRows, error: entryErr } = await supabase
    .from("entries")
    .select("id, reference_id")
    .eq("entry_type", entryType)
    .in("reference_id", referenceIds);
  if (entryErr) throw entryErr;

  const entryToReference = new Map<number, number>();
  for (const row of entryRows || []) {
    entryToReference.set(
      Number((row as { id: number }).id),
      Number((row as { reference_id: number }).reference_id)
    );
  }
  const entryIds = Array.from(entryToReference.keys());
  if (entryIds.length === 0) return result;

  const { data: paymentRows, error: payErr } = await supabase
    .from("payments")
    .select("id, entry_id, amount")
    .in("entry_id", entryIds);
  if (payErr) throw payErr;

  const paymentIdToReference = new Map<number, number>();
  for (const row of paymentRows || []) {
    const paymentId = Number((row as { id: number }).id);
    const referenceId = entryToReference.get(Number((row as { entry_id: number }).entry_id));
    if (referenceId == null) continue;
    paymentIdToReference.set(paymentId, referenceId);
    const slice = Number((row as { amount: number | string }).amount) || 0;
    const current = result.get(referenceId) ?? emptyAggregate();
    current.paymentCount += 1;
    current.totalPaidAmount = Math.round((current.totalPaidAmount + slice) * 100) / 100;
    result.set(referenceId, current);
  }

  const paymentIds = Array.from(paymentIdToReference.keys());
  if (paymentIds.length === 0) return result;

  const { data: allocationRows, error: allocErr } = await supabase
    .from("bank_transaction_allocations")
    .select("entity_id")
    .eq("entity_type", "payment")
    .in("entity_id", paymentIds);
  if (allocErr) throw allocErr;

  for (const row of allocationRows || []) {
    const paymentId = Number((row as { entity_id: number }).entity_id);
    const referenceId = paymentIdToReference.get(paymentId);
    if (referenceId == null) continue;
    const current = result.get(referenceId) ?? emptyAggregate();
    current.reconciledPaymentCount += 1;
    result.set(referenceId, current);
  }

  return result;
}
