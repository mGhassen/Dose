// Payments API Route
// Handles CRUD operations for payments linked to entries (allocation slices; M2M via many rows).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';
import { parseRequestBody, createPaymentSchema, type CreatePaymentInput } from '@/shared/zod-schemas';
import { assertBankAllocationWithinCap } from '@/lib/ledger/bank-allocation-cap';

export interface Payment {
  id: number;
  entryId: number;
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  bankTransactionId?: number;
  paymentGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

/** @deprecated use CreatePaymentInput from zod-schemas */
export type CreatePaymentData = CreatePaymentInput;

export type UpdatePaymentData = Partial<{
  entryId: number;
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  bankTransactionId: number | null;
  paymentGroupId: string | null;
}>;

function transformPayment(row: any): Payment {
  return {
    id: row.id,
    entryId: row.entry_id,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    paymentMethod: row.payment_method,
    notes: row.notes,
    bankTransactionId: row.bank_transaction_id != null ? Number(row.bank_transaction_id) : undefined,
    paymentGroupId: row.payment_group_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function insertPayloadFromBody(body: CreatePaymentInput, entryId: number) {
  const row: Record<string, unknown> = {
    entry_id: entryId,
    payment_date: body.paymentDate,
    amount: body.amount,
    is_paid: body.isPaid !== undefined ? body.isPaid : true,
    paid_date: body.paidDate ?? body.paymentDate,
    payment_method: body.paymentMethod ?? null,
    notes: body.notes ?? null,
  };
  if (body.bankTransactionId != null) row.bank_transaction_id = body.bankTransactionId;
  if (body.paymentGroupId != null && body.paymentGroupId !== "") row.payment_group_id = body.paymentGroupId;
  return row;
}

async function ensureLoanPaymentExpense(
  supabase: ReturnType<typeof supabaseServer>,
  entryId: number,
  paymentDate: string
): Promise<void> {
  try {
    const { data: entry } = await supabase
      .from('entries')
      .select('id, entry_type, reference_id, schedule_entry_id, name, description')
      .eq('id', entryId)
      .single();

    if (!entry || entry.entry_type !== 'loan_payment') return;
    const loanId = entry.reference_id;
    const scheduleId = entry.schedule_entry_id;
    if (loanId == null || scheduleId == null) return;

    const { data: schedule } = await supabase
      .from('loan_schedules')
      .select('id, month, payment_date, total_payment')
      .eq('id', scheduleId)
      .single();
    if (!schedule) return;

    const expenseDate = schedule.payment_date;

    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('loan_id', loanId)
      .eq('expense_type', 'loan')
      .eq('expense_date', expenseDate)
      .maybeSingle();
    if (existing) return;

    const { data: loan } = await supabase
      .from('loans')
      .select('name')
      .eq('id', loanId)
      .single();

    const amount = parseFloat(schedule.total_payment);
    await supabase.from('expenses').insert({
      name: `${loan?.name ?? 'Loan'} - Payment Month ${schedule.month}`,
      category: 'loan_repayment',
      expense_type: 'loan',
      amount,
      subtotal: amount,
      total_tax: 0,
      total_discount: 0,
      loan_id: loanId,
      expense_date: expenseDate,
      start_date: expenseDate,
      description: entry.description ?? null,
      is_active: true,
    });
  } catch (err) {
    console.error('Failed to ensure loan payment expense:', err);
  }
}

async function ensureLeasingPaymentExpense(
  supabase: ReturnType<typeof supabaseServer>,
  entryId: number,
  paymentDate: string
): Promise<void> {
  try {
    const { data: entry } = await supabase
      .from('entries')
      .select('id, entry_type, reference_id, schedule_entry_id, description')
      .eq('id', entryId)
      .single();

    if (!entry || entry.entry_type !== 'leasing_payment') return;
    const leasingId = entry.reference_id;
    const timelineId = entry.schedule_entry_id;
    if (leasingId == null || timelineId == null) return;

    const { data: timeline } = await supabase
      .from('leasing_timeline_entries')
      .select('id, month, payment_date, amount')
      .eq('id', timelineId)
      .single();
    if (!timeline) return;

    const expenseDate = timeline.payment_date;

    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('leasing_id', leasingId)
      .eq('expense_type', 'leasing')
      .eq('expense_date', expenseDate)
      .maybeSingle();
    if (existing) return;

    const { data: leasing } = await supabase
      .from('leasing_payments')
      .select('name')
      .eq('id', leasingId)
      .single();

    const amount = parseFloat(timeline.amount);
    await supabase.from('expenses').insert({
      name: `${leasing?.name ?? 'Leasing'} - Payment ${timeline.month}`,
      category: 'leasing',
      expense_type: 'leasing',
      amount,
      subtotal: amount,
      total_tax: 0,
      total_discount: 0,
      leasing_id: leasingId,
      expense_date: expenseDate,
      start_date: expenseDate,
      description: entry.description ?? null,
      is_active: true,
    });
  } catch (err) {
    console.error('Failed to ensure leasing payment expense:', err);
  }
}

async function resolveDocumentEntryId(
  supabase: ReturnType<typeof supabaseServer>,
  entryType: 'expense' | 'sale',
  referenceId: number
): Promise<number | null> {
  const { data: rows, error } = await supabase
    .from('entries')
    .select('id')
    .eq('entry_type', entryType)
    .eq('reference_id', referenceId)
    .order('id', { ascending: true })
    .limit(1);
  if (error) throw error;
  return rows?.[0]?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');
    const loanId = searchParams.get('loanId');
    const entryType = searchParams.get('entryType');
    const referenceId = searchParams.get('referenceId');
    const bankTransactionId = searchParams.get('bankTransactionId');
    const isPaid = searchParams.get('isPaid');
    const month = searchParams.get('month');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = supabaseServer();

    let entryIds: number[] | null = null;

    if (loanId) {
      const { data: loanEntries } = await supabase
        .from('entries')
        .select('id')
        .eq('reference_id', parseInt(loanId, 10))
        .in('entry_type', ['loan', 'loan_payment']);

      if (loanEntries && loanEntries.length > 0) {
        entryIds = loanEntries.map((e) => e.id);
      } else {
        return NextResponse.json(createPaginatedResponse([], 0, page, limit));
      }
    } else if (entryType && referenceId) {
      if (entryType !== 'expense' && entryType !== 'sale') {
        return NextResponse.json({ error: 'entryType must be expense or sale' }, { status: 400 });
      }
      const { data: docEntries, error: deErr } = await supabase
        .from('entries')
        .select('id')
        .eq('entry_type', entryType)
        .eq('reference_id', parseInt(referenceId, 10));
      if (deErr) throw deErr;
      if (!docEntries?.length) {
        return NextResponse.json(createPaginatedResponse([], 0, page, limit));
      }
      entryIds = docEntries.map((e) => e.id);
    }

    let countQuery = supabase.from('payments').select('*', { count: 'exact', head: true });
    let query = supabase.from('payments').select('*').order('payment_date', { ascending: false });

    if (entryId) {
      query = query.eq('entry_id', entryId);
      countQuery = countQuery.eq('entry_id', entryId);
    } else if (entryIds && entryIds.length > 0) {
      query = query.in('entry_id', entryIds);
      countQuery = countQuery.in('entry_id', entryIds);
    } else if (loanId) {
      return NextResponse.json(createPaginatedResponse([], 0, page, limit));
    }

    if (bankTransactionId) {
      query = query.eq('bank_transaction_id', bankTransactionId);
      countQuery = countQuery.eq('bank_transaction_id', bankTransactionId);
    }

    if (isPaid !== null && isPaid !== undefined && isPaid !== '') {
      const paid = isPaid === 'true';
      query = query.eq('is_paid', paid);
      countQuery = countQuery.eq('is_paid', paid);
    }

    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(`${month}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];

      query = query.gte('payment_date', startOfMonth).lte('payment_date', endDate);
      countQuery = countQuery.gte('payment_date', startOfMonth).lte('payment_date', endDate);
    }

    query = query.range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([query, countQuery]);

    if (error) throw error;
    if (countError) throw countError;

    const payments: Payment[] = (data || []).map(transformPayment);
    const total = count || 0;

    return NextResponse.json(createPaginatedResponse(payments, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseRequestBody(request, createPaymentSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.data;

    const supabase = supabaseServer();

    let entryId = body.entryId;
    if (entryId == null && body.entryType != null && body.referenceId != null) {
      const resolved = await resolveDocumentEntryId(supabase, body.entryType, body.referenceId);
      if (resolved == null) {
        return NextResponse.json(
          { error: `No ledger entry found for ${body.entryType} ${body.referenceId}` },
          { status: 404 }
        );
      }
      entryId = resolved;
    }

    if (entryId == null) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }

    const { data: entry, error: entryError } = await supabase
      .from('entries')
      .select('id')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (body.bankTransactionId != null) {
      const cap = await assertBankAllocationWithinCap(supabase, body.bankTransactionId, body.amount);
      if (!cap.ok) {
        return NextResponse.json({ error: cap.message }, { status: cap.status });
      }
    }

    const { data, error } = await supabase
      .from('payments')
      .insert(insertPayloadFromBody(body, entryId))
      .select()
      .single();

    if (error) throw error;

    await ensureLoanPaymentExpense(supabase, entryId, body.paymentDate);
    await ensureLeasingPaymentExpense(supabase, entryId, body.paymentDate);

    return NextResponse.json(transformPayment(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', details: error.message },
      { status: 500 }
    );
  }
}
