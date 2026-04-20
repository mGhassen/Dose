import type { SupabaseClient } from '@supabase/supabase-js';

function dateOnly(d: string | null | undefined): string | null {
  if (d == null || d === '') return null;
  const s = String(d).split('T')[0]?.trim();
  return s || null;
}

/**
 * Returns the ledger `entries.id` for this expense (creates `entry_type: expense` if missing).
 * Subscription projection and some imports create `expenses` rows without a matching entry.
 */
export async function ensureExpenseLedgerEntryForExpenseId(
  supabase: SupabaseClient,
  expenseId: number,
  options?: { fallbackEntryDate?: string }
): Promise<number | null> {
  const { data: rows, error } = await supabase
    .from('entries')
    .select('id')
    .eq('entry_type', 'expense')
    .eq('reference_id', expenseId)
    .order('id', { ascending: true })
    .limit(1);
  if (error) throw error;
  const existing = rows?.[0]?.id;
  if (existing != null) return existing;

  const { data: exp, error: expErr } = await supabase
    .from('expenses')
    .select('id, name, amount, description, category, vendor, supplier_id, expense_date, start_date, is_active')
    .eq('id', expenseId)
    .maybeSingle();
  if (expErr) throw expErr;
  if (!exp) return null;

  const entryDate =
    dateOnly(exp.expense_date) ?? dateOnly(exp.start_date) ?? dateOnly(options?.fallbackEntryDate);
  if (entryDate == null) {
    throw new Error(`Expense ${expenseId} has no expense_date/start_date and no fallbackEntryDate`);
  }

  const { data: created, error: insErr } = await supabase
    .from('entries')
    .insert({
      direction: 'output',
      entry_type: 'expense',
      name: exp.name,
      amount: Number(exp.amount),
      description: exp.description ?? null,
      category: exp.category ?? null,
      vendor: exp.vendor ?? null,
      supplier_id: exp.supplier_id ?? null,
      entry_date: entryDate,
      reference_id: exp.id,
      is_active: exp.is_active ?? true,
    })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return created?.id ?? null;
}
