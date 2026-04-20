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
  linked_entry_id?: number;
  linked_expense_id?: number;
  linked_expense_name?: string | null;
  linked_sale_id?: number;
  linked_sale_name?: string | null;
};

export type AllocationSummary = {
  allocations: AllocationRow[];
  allocated_total: number;
  remaining: number;
  fully_reconciled: boolean;
  allocation_kinds: AllocationRow['entity_type'][];
};

async function enrichAllocationsWithPaymentTargets(
  supabase: SupabaseClient,
  allocations: AllocationRow[]
): Promise<AllocationRow[]> {
  const paymentIds = allocations.filter((a) => a.entity_type === 'payment').map((a) => a.entity_id);
  if (paymentIds.length === 0) return allocations;

  const { data: payRows } = await supabase.from('payments').select('id, entry_id').in('id', paymentIds);
  const payById = new Map<number, { entry_id: number }>();
  for (const p of payRows ?? []) {
    const row = p as { id: number; entry_id: number };
    payById.set(row.id, { entry_id: row.entry_id });
  }

  const entryIds = Array.from(
    new Set(
      Array.from(payById.values())
        .map((v) => v.entry_id)
        .filter((id) => Number.isFinite(id))
    )
  );
  if (entryIds.length === 0) return allocations;

  const { data: entRows } = await supabase
    .from('entries')
    .select('id, entry_type, reference_id, name')
    .in('id', entryIds);

  const entryById = new Map<number, { entry_type: string; reference_id: number | null; name: string | null }>();
  const expenseIds = new Set<number>();
  const saleIds = new Set<number>();
  for (const e of entRows ?? []) {
    const row = e as { id: number; entry_type: string; reference_id: number | null; name: string | null };
    entryById.set(row.id, { entry_type: row.entry_type, reference_id: row.reference_id, name: row.name });
    if (row.entry_type === 'expense' && row.reference_id != null) expenseIds.add(row.reference_id);
    if (row.entry_type === 'sale' && row.reference_id != null) saleIds.add(row.reference_id);
  }

  const expenseNameById = new Map<number, string | null>();
  if (expenseIds.size > 0) {
    const { data: exRows } = await supabase.from('expenses').select('id, name').in('id', Array.from(expenseIds));
    for (const ex of exRows ?? []) {
      const row = ex as { id: number; name: string | null };
      expenseNameById.set(row.id, row.name);
    }
  }

  const saleNameById = new Map<number, string | null>();
  if (saleIds.size > 0) {
    const { data: sRows } = await supabase.from('sales').select('id, description').in('id', Array.from(saleIds));
    for (const s of sRows ?? []) {
      const row = s as { id: number; description: string | null };
      saleNameById.set(row.id, row.description);
    }
  }

  return allocations.map((a) => {
    if (a.entity_type !== 'payment') return a;
    const pay = payById.get(a.entity_id);
    if (!pay) return a;
    const ent = entryById.get(pay.entry_id);
    if (!ent) return { ...a, linked_entry_id: pay.entry_id };

    const base: AllocationRow = { ...a, linked_entry_id: pay.entry_id };
    if (ent.entry_type === 'expense' && ent.reference_id != null) {
      return {
        ...base,
        linked_expense_id: ent.reference_id,
        linked_expense_name: expenseNameById.get(ent.reference_id) ?? ent.name,
      };
    }
    if (ent.entry_type === 'sale' && ent.reference_id != null) {
      return {
        ...base,
        linked_sale_id: ent.reference_id,
        linked_sale_name: saleNameById.get(ent.reference_id) ?? ent.name,
      };
    }
    return base;
  });
}

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

  const enriched = await enrichAllocationsWithPaymentTargets(supabase, allocations);

  const allocated = enriched.reduce((s, r) => s + Number(r.amount), 0);
  const rounded = Math.round(allocated * 100) / 100;
  const remaining = Math.round((Number(bankTxAmount) - allocated) * 100) / 100;
  const fully = Math.abs(remaining) < 0.005;

  const kinds = Array.from(new Set(enriched.map((a) => a.entity_type)));

  return {
    allocations: enriched,
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
