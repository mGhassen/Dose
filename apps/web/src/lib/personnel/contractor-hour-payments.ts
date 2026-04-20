import type { SupabaseClient } from '@supabase/supabase-js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Sum posted payments per expense id (contractor hour expense → one expense entry). */
export async function sumPaymentsByExpenseIds(
  supabase: SupabaseClient,
  expenseIds: number[]
): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (expenseIds.length === 0) return out;
  const unique = [...new Set(expenseIds)];

  const { data: ledgerEntries, error: leErr } = await supabase
    .from('entries')
    .select('id, reference_id')
    .eq('entry_type', 'expense')
    .in('reference_id', unique);
  if (leErr || !ledgerEntries?.length) return out;

  const entryIds = ledgerEntries.map((e) => Number(e.id));
  const { data: pays, error: payErr } = await supabase
    .from('payments')
    .select('entry_id, amount')
    .in('entry_id', entryIds);
  if (payErr) return out;

  const sumByEntryId = new Map<number, number>();
  for (const p of pays || []) {
    const eid = Number(p.entry_id);
    const amt = parseFloat(String(p.amount ?? 0));
    sumByEntryId.set(eid, round2((sumByEntryId.get(eid) || 0) + amt));
  }

  for (const le of ledgerEntries) {
    const ref = Number(le.reference_id);
    out.set(ref, round2(sumByEntryId.get(Number(le.id)) || 0));
  }
  return out;
}

/** After payments change on an expense ledger entry (e.g. from expense UI), sync linked contractor hour rows. */
export async function reconcileContractorHourEntriesForLedgerEntryId(
  supabase: SupabaseClient,
  ledgerEntryId: number
): Promise<void> {
  try {
    const { data: ent, error } = await supabase
      .from('entries')
      .select('entry_type, reference_id')
      .eq('id', ledgerEntryId)
      .maybeSingle();
    if (error || !ent || ent.entry_type !== 'expense' || ent.reference_id == null) return;

    const { data: rows } = await supabase
      .from('personnel_hour_entries')
      .select('id')
      .eq('expense_id', Number(ent.reference_id));
    for (const r of rows || []) {
      await reconcileContractorHourEntryPayments(supabase, r.id);
    }
  } catch (e) {
    console.error('reconcileContractorHourEntriesForLedgerEntryId:', e);
  }
}

export async function reconcileContractorHourEntryPayments(
  supabase: SupabaseClient,
  hourEntryId: string | number
): Promise<{
  paidTotal: number;
  gross: number;
  isPaid: boolean;
  paidDate: string | null;
}> {
  const { data: row, error } = await supabase
    .from('personnel_hour_entries')
    .select('id, amount_gross, expense_id')
    .eq('id', hourEntryId)
    .maybeSingle();
  if (error) throw error;
  if (!row) {
    return { paidTotal: 0, gross: 0, isPaid: false, paidDate: null };
  }

  const gross = round2(parseFloat(String(row.amount_gross ?? 0)));
  const expenseId = row.expense_id as number | null;
  if (!expenseId) {
    await supabase
      .from('personnel_hour_entries')
      .update({ is_paid: false, paid_date: null })
      .eq('id', hourEntryId);
    return { paidTotal: 0, gross, isPaid: false, paidDate: null };
  }

  const sums = await sumPaymentsByExpenseIds(supabase, [expenseId]);
  const paidTotal = round2(sums.get(expenseId) || 0);
  const isFullyPaid = paidTotal >= gross - 0.01;

  let latestPaidDate: string | null = null;
  if (paidTotal > 0) {
    const { data: ledgerEntry } = await supabase
      .from('entries')
      .select('id')
      .eq('entry_type', 'expense')
      .eq('reference_id', expenseId)
      .maybeSingle();
    if (ledgerEntry?.id) {
      const { data: payRows } = await supabase
        .from('payments')
        .select('payment_date')
        .eq('entry_id', ledgerEntry.id)
        .order('payment_date', { ascending: false })
        .limit(1);
      const d = payRows?.[0]?.payment_date;
      if (d) latestPaidDate = String(d).split('T')[0].slice(0, 10);
    }
  }

  await supabase
    .from('personnel_hour_entries')
    .update({
      is_paid: isFullyPaid,
      paid_date: isFullyPaid ? latestPaidDate : null,
    })
    .eq('id', hourEntryId);

  return {
    paidTotal,
    gross,
    isPaid: isFullyPaid,
    paidDate: isFullyPaid ? latestPaidDate : null,
  };
}
