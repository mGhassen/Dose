import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentSliceInput } from '@/shared/zod-schemas';
import { replacePaymentsForEntry } from '@/lib/ledger/replace-entry-payments';

export const PERSONNEL_SALARY_PAYMENT_ENTRY_TYPE = 'personnel_salary_payment' as const;

export function personnelSalaryProjectionExpenseDescription(projectionId: number): string {
  return `personnel_salary_projection:${projectionId}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** DB row shape from personnel_salary_projections */
export type PersonnelSalaryProjectionRow = {
  id: number;
  personnel_id: number;
  month: string;
  brute_salary: number | string;
  net_salary: number | string;
  social_taxes?: number | string | null;
  employer_taxes?: number | string | null;
  net_payment_date?: string | null;
  taxes_payment_date?: string | null;
  is_net_paid?: boolean | null;
  is_taxes_paid?: boolean | null;
  net_paid_date?: string | null;
  taxes_paid_date?: string | null;
  actual_net_amount?: number | string | null;
  actual_taxes_amount?: number | string | null;
  notes?: string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null || v === '') return 0;
  return typeof v === 'number' ? v : parseFloat(String(v));
}

function buildSlices(row: PersonnelSalaryProjectionRow): PaymentSliceInput[] {
  const slices: PaymentSliceInput[] = [];
  const monthAnchor = `${row.month}-01`;

  if (row.is_net_paid) {
    const amount = round2(
      num(row.actual_net_amount) || num(row.net_salary)
    );
    const raw =
      row.net_paid_date ||
      row.net_payment_date ||
      monthAnchor;
    const paymentDate = (raw.split('T')[0] || raw).slice(0, 10);
    if (amount > 0) {
      slices.push({ amount, paymentDate, notes: row.notes ?? undefined });
    }
  }

  if (row.is_taxes_paid) {
    const taxesFallback = round2(num(row.social_taxes) + num(row.employer_taxes));
    const amount = round2(num(row.actual_taxes_amount) || taxesFallback);
    const raw =
      row.taxes_paid_date ||
      row.taxes_payment_date ||
      monthAnchor;
    const paymentDate = (raw.split('T')[0] || raw).slice(0, 10);
    if (amount > 0) {
      slices.push({ amount, paymentDate, notes: row.notes ?? undefined });
    }
  }

  return slices;
}

export async function removePersonnelSalaryProjectionLedger(
  supabase: SupabaseClient,
  personnelId: number,
  projectionId: number
): Promise<{ error: string | null }> {
  const desc = personnelSalaryProjectionExpenseDescription(projectionId);

  const { error: expErr } = await supabase.from('expenses').delete().eq('description', desc);
  if (expErr) return { error: expErr.message };

  const { data: ent } = await supabase
    .from('entries')
    .select('id')
    .eq('reference_id', personnelId)
    .eq('schedule_entry_id', projectionId)
    .eq('entry_type', PERSONNEL_SALARY_PAYMENT_ENTRY_TYPE)
    .maybeSingle();

  if (ent?.id) {
    const { error: delErr } = await supabase.from('entries').delete().eq('id', ent.id);
    if (delErr) return { error: delErr.message };
  }

  return { error: null };
}

/**
 * Keeps entries, payments, and expenses in sync with personnel_salary_projections
 * when net and/or taxes are marked paid (subscription projection pattern).
 */
export async function syncPersonnelSalaryProjectionLedger(
  supabase: SupabaseClient,
  personnelId: number,
  row: PersonnelSalaryProjectionRow
): Promise<{ error: string | null }> {
  const projectionId = row.id;
  const netPaid = !!row.is_net_paid;
  const taxesPaid = !!row.is_taxes_paid;

  if (!netPaid && !taxesPaid) {
    return removePersonnelSalaryProjectionLedger(supabase, personnelId, projectionId);
  }

  const slices = buildSlices(row);
  if (slices.length === 0) {
    return removePersonnelSalaryProjectionLedger(supabase, personnelId, projectionId);
  }

  const totalAmount = round2(slices.reduce((s, x) => s + x.amount, 0));
  if (totalAmount <= 0) {
    return { error: 'Personnel salary payment amounts must be positive when marked paid' };
  }

  const { data: person, error: pErr } = await supabase
    .from('personnel')
    .select('first_name, last_name, is_active')
    .eq('id', personnelId)
    .maybeSingle();

  if (pErr) return { error: pErr.message };
  if (!person) return { error: 'Personnel not found' };

  const displayName = `${person.first_name} ${person.last_name}`.trim();
  const entryName = `${displayName} — ${row.month}`;
  const firstDate = slices[0].paymentDate.split('T')[0] || slices[0].paymentDate;
  const expenseDate = firstDate.slice(0, 10);
  const desc = personnelSalaryProjectionExpenseDescription(projectionId);

  let entryId: number | null = null;
  const { data: foundEntry, error: findErr } = await supabase
    .from('entries')
    .select('id')
    .eq('reference_id', personnelId)
    .eq('schedule_entry_id', projectionId)
    .eq('entry_type', PERSONNEL_SALARY_PAYMENT_ENTRY_TYPE)
    .maybeSingle();

  if (findErr) return { error: findErr.message };
  entryId = foundEntry?.id ?? null;

  if (!entryId) {
    const { data: inserted, error: insErr } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: PERSONNEL_SALARY_PAYMENT_ENTRY_TYPE,
        name: entryName,
        amount: totalAmount,
        description: row.notes || `Salary payments for ${row.month}`,
        category: 'personnel',
        entry_date: expenseDate,
        due_date: expenseDate,
        reference_id: personnelId,
        schedule_entry_id: projectionId,
        is_active: person.is_active !== false,
      })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      return { error: insErr?.message ?? 'Failed to create personnel salary ledger entry' };
    }
    entryId = inserted.id;
  } else {
    const { error: updErr } = await supabase
      .from('entries')
      .update({
        name: entryName,
        amount: totalAmount,
        description: row.notes || `Salary payments for ${row.month}`,
        entry_date: expenseDate,
        due_date: expenseDate,
      })
      .eq('id', entryId);

    if (updErr) return { error: updErr.message };
  }

  if (entryId == null) {
    return { error: 'Missing ledger entry id for personnel salary' };
  }

  const payRes = await replacePaymentsForEntry(supabase, entryId, slices);
  if (payRes.error) return payRes;

  const { data: existingExp } = await supabase
    .from('expenses')
    .select('id')
    .eq('description', desc)
    .maybeSingle();

  const expensePayload = {
    name: entryName,
    category: 'personnel',
    expense_type: 'personnel',
    amount: totalAmount,
    subtotal: totalAmount,
    total_tax: 0,
    total_discount: 0,
    expense_date: expenseDate,
    start_date: expenseDate,
    description: desc,
    is_active: true,
  };

  if (existingExp?.id) {
    const { error: exUpd } = await supabase.from('expenses').update(expensePayload).eq('id', existingExp.id);
    if (exUpd) return { error: exUpd.message };

    const { error: liDel } = await supabase.from('expense_line_items').delete().eq('expense_id', existingExp.id);
    if (liDel) return { error: liDel.message };

    const { error: liIns } = await supabase.from('expense_line_items').insert({
      expense_id: existingExp.id,
      item_id: null,
      quantity: 1,
      unit_id: null,
      unit_price: totalAmount,
      unit_cost: null,
      tax_rate_percent: 0,
      tax_amount: 0,
      line_total: totalAmount,
      sort_order: 0,
    });
    if (liIns) return { error: liIns.message };
  } else {
    const { data: expRow, error: expIns } = await supabase
      .from('expenses')
      .insert(expensePayload)
      .select('id')
      .single();

    if (expIns || !expRow?.id) {
      return { error: expIns?.message ?? 'Failed to create personnel salary expense' };
    }

    const { error: liErr } = await supabase.from('expense_line_items').insert({
      expense_id: expRow.id,
      item_id: null,
      quantity: 1,
      unit_id: null,
      unit_price: totalAmount,
      unit_cost: null,
      tax_rate_percent: 0,
      tax_amount: 0,
      line_total: totalAmount,
      sort_order: 0,
    });
    if (liErr) return { error: liErr.message };
  }

  return { error: null };
}
