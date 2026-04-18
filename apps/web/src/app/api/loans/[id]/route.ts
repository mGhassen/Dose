// Loan by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { Loan, UpdateLoanData } from '@kit/types';

function transformLoan(row: any): Loan {
  return {
    id: row.id,
    name: row.name,
    loanNumber: row.loan_number,
    principalAmount: parseFloat(row.principal_amount),
    interestRate: parseFloat(row.interest_rate),
    durationMonths: row.duration_months,
    startDate: row.start_date,
    status: row.status,
    lender: row.lender, // Keep for backward compatibility
    supplierId: row.supplier_id || undefined,
    description: row.description,
    offPaymentMonths: row.off_payment_months || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateLoanData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.loanNumber !== undefined) result.loan_number = data.loanNumber;
  if (data.principalAmount !== undefined) result.principal_amount = data.principalAmount;
  if (data.interestRate !== undefined) result.interest_rate = data.interestRate;
  if (data.durationMonths !== undefined) result.duration_months = data.durationMonths;
  if (data.startDate !== undefined) result.start_date = data.startDate;
  if (data.status !== undefined) result.status = data.status;
  if (data.lender !== undefined) result.lender = data.lender; // Keep for backward compatibility
  if (data.supplierId !== undefined) result.supplier_id = data.supplierId || null;
  if (data.description !== undefined) result.description = data.description;
  if (data.offPaymentMonths !== undefined) result.off_payment_months = data.offPaymentMonths || [];
  result.updated_at = new Date().toISOString();
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformLoan(data));
  } catch (error: any) {
    console.error('Error fetching loan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan', details: error.message },
      { status: 500 }
    );
  }
}

const SCHEDULE_AFFECTING_FIELDS = [
  'principalAmount',
  'interestRate',
  'durationMonths',
  'startDate',
  'offPaymentMonths',
] as const;

function arraysEqualUnordered(a: number[] | null | undefined, b: number[] | null | undefined): boolean {
  const la = (a || []).slice().sort((x, y) => x - y);
  const lb = (b || []).slice().sort((x, y) => x - y);
  if (la.length !== lb.length) return false;
  return la.every((v, i) => v === lb[i]);
}

async function loanHasPayments(
  supabase: ReturnType<typeof supabaseServer>,
  loanId: string | number
): Promise<boolean> {
  const { data: entries } = await supabase
    .from('entries')
    .select('id')
    .eq('reference_id', parseInt(String(loanId)))
    .eq('entry_type', 'loan_payment')
    .eq('direction', 'output');

  const entryIds = (entries || []).map((e: any) => e.id);
  if (entryIds.length === 0) return false;

  const { count } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .in('entry_id', entryIds)
    .eq('is_paid', true);

  return (count || 0) > 0;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.updateLoanSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateLoanData;

    const supabase = supabaseServer();

    const { data: currentRow, error: currentErr } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single();

    if (currentErr) {
      if (currentErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      throw currentErr;
    }

    const current = transformLoan(currentRow);

    const scheduleAffectingChanged = SCHEDULE_AFFECTING_FIELDS.some((field) => {
      const next = (body as any)[field];
      if (next === undefined) return false;
      if (field === 'offPaymentMonths') {
        return !arraysEqualUnordered(current.offPaymentMonths, next);
      }
      if (field === 'startDate') {
        const currentDate = (current.startDate || '').split('T')[0];
        return currentDate !== next;
      }
      return (current as any)[field] !== next;
    });

    if (scheduleAffectingChanged) {
      const hasPayments = await loanHasPayments(supabase, id);
      if (hasPayments) {
        return NextResponse.json(
          {
            error: 'Cannot change schedule-related fields while payments exist. Delete the payments first.',
            code: 'LOAN_HAS_PAYMENTS',
          },
          { status: 409 }
        );
      }
    }

    const { data, error } = await supabase
      .from('loans')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformLoan(data));
  } catch (error: any) {
    console.error('Error updating loan:', error);
    return NextResponse.json(
      { error: 'Failed to update loan', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting loan:', error);
    return NextResponse.json(
      { error: 'Failed to delete loan', details: error.message },
      { status: 500 }
    );
  }
}

