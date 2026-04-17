import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentSliceInput } from '@/shared/zod-schemas';

export function paymentSlicesSumMatchesTotal(
  slices: Pick<PaymentSliceInput, 'amount'>[],
  total: number,
  tolerance = 0.01
): boolean {
  const sum = Math.round(slices.reduce((s, x) => s + x.amount, 0) * 100) / 100;
  return Math.abs(sum - total) <= tolerance;
}

export async function replacePaymentsForEntry(
  supabase: SupabaseClient,
  entryId: number,
  slices: PaymentSliceInput[]
): Promise<{ error: string | null }> {
  const { error: delErr } = await supabase.from('payments').delete().eq('entry_id', entryId);
  if (delErr) return { error: delErr.message };

  for (const s of slices) {
    const dateStr = s.paymentDate.split('T')[0] || s.paymentDate;
    const { error: insErr } = await supabase.from('payments').insert({
      entry_id: entryId,
      payment_date: dateStr,
      amount: s.amount,
      is_paid: true,
      paid_date: dateStr,
      notes: s.notes ?? null,
      bank_transaction_id: s.bankTransactionId ?? null,
      payment_group_id: s.paymentGroupId ?? null,
    });
    if (insErr) return { error: insErr.message };
  }
  return { error: null };
}
