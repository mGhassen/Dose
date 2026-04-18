import type { SupabaseClient } from '@supabase/supabase-js';

export type AllocationRow = {
  id: number;
  account_id: string;
  bank_transaction_id: number;
  entity_type: 'payment' | 'balance_movement' | 'expense' | 'sale' | 'entry';
  entity_id: number;
  amount: number | string;
  label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AllocationSummary = {
  allocations: AllocationRow[];
  allocated_total: number;
  remaining: number;
  fully_reconciled: boolean;
  allocation_kinds: AllocationRow['entity_type'][];
};

/** Read allocations + derived totals for a bank transaction. */
export async function loadBankTxAllocations(
  supabase: SupabaseClient,
  bankTxId: number,
  bankTxAmount: number
): Promise<AllocationSummary> {
  const { data } = await supabase
    .from('bank_transaction_allocations')
    .select('*')
    .eq('bank_transaction_id', bankTxId)
    .order('id', { ascending: true });

  const allocations = ((data ?? []) as AllocationRow[]).map((r) => ({
    ...r,
    amount: Number(r.amount),
  })) as AllocationRow[];

  const allocated = allocations.reduce((s, r) => s + Number(r.amount), 0);
  const rounded = Math.round(allocated * 100) / 100;
  const remaining = Math.round((Number(bankTxAmount) - allocated) * 100) / 100;
  const fully = Math.abs(remaining) < 0.005;

  const kinds = Array.from(new Set(allocations.map((a) => a.entity_type)));

  return {
    allocations,
    allocated_total: rounded,
    remaining,
    fully_reconciled: fully,
    allocation_kinds: kinds,
  };
}

/** Merge an allocations summary into a bank tx row for API responses. */
export function withAllocationsSummary<T extends { amount: number | string }>(
  bankTx: T,
  summary: AllocationSummary
) {
  return {
    ...bankTx,
    allocations: summary.allocations,
    allocated_total: summary.allocated_total,
    remaining: summary.remaining,
    fully_reconciled: summary.fully_reconciled,
    allocation_kinds: summary.allocation_kinds,
  };
}
