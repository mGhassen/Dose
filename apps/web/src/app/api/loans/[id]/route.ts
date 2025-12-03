// Loan by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
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
    lender: row.lender,
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
  if (data.lender !== undefined) result.lender = data.lender;
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
    const supabase = createServerSupabaseClient();
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateLoanData = await request.json();

    const supabase = createServerSupabaseClient();
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
    const supabase = createServerSupabaseClient();
    
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

