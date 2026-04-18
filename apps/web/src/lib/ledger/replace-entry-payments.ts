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

/**
 * Replace all payments for an entry. When a slice carries `bankTransactionId`,
 * also insert a `bank_transaction_allocations` row tying the payment to that
 * bank line (sign mirrors the bank tx amount).
 *
 * The cascade trigger on `payments` deletes existing allocations automatically
 * when we delete the prior payments, so we only need to recreate allocations
 * for the new slice set.
 */
export async function replacePaymentsForEntry(
  supabase: SupabaseClient,
  entryId: number,
  slices: PaymentSliceInput[]
): Promise<{ error: string | null }> {
  const { error: delErr } = await supabase.from('payments').delete().eq('entry_id', entryId);
  if (delErr) return { error: delErr.message };

  const bankTxCache = new Map<number, { account_id: string; amount: number }>();

  for (const s of slices) {
    const dateStr = s.paymentDate.split('T')[0] || s.paymentDate;
    const row: Record<string, unknown> = {
      entry_id: entryId,
      payment_date: dateStr,
      amount: s.amount,
      is_paid: true,
      paid_date: dateStr,
      notes: s.notes ?? null,
    };
    if (s.paymentGroupId != null && s.paymentGroupId !== '') row.payment_group_id = s.paymentGroupId;

    const { data: inserted, error: insErr } = await supabase
      .from('payments')
      .insert(row)
      .select('id')
      .single();
    if (insErr || !inserted) return { error: insErr?.message ?? 'Failed to insert payment' };

    if (s.bankTransactionId != null) {
      let bankTx = bankTxCache.get(s.bankTransactionId);
      if (!bankTx) {
        const { data: tx } = await supabase
          .from('bank_transactions')
          .select('account_id, amount')
          .eq('id', s.bankTransactionId)
          .maybeSingle();
        if (!tx) return { error: `Bank transaction ${s.bankTransactionId} not found` };
        bankTx = { account_id: tx.account_id, amount: Number(tx.amount) };
        bankTxCache.set(s.bankTransactionId, bankTx);
      }
      const signed = Math.abs(s.amount) * (Math.sign(bankTx.amount) || 1);
      const { error: allocErr } = await supabase.from('bank_transaction_allocations').insert({
        account_id: bankTx.account_id,
        bank_transaction_id: s.bankTransactionId,
        entity_type: 'payment',
        entity_id: (inserted as { id: number }).id,
        amount: signed,
        notes: s.notes ?? null,
      });
      if (allocErr) return { error: allocErr.message };
    }
  }
  return { error: null };
}
