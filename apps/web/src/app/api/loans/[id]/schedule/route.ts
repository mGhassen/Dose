// Get Loan Schedule API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { LoanScheduleEntry } from '@kit/types';

function transformScheduleEntry(row: any): LoanScheduleEntry {
  return {
    id: row.id,
    loanId: row.loan_id,
    month: row.month,
    paymentDate: row.payment_date,
    principalPayment: parseFloat(row.principal_payment),
    interestPayment: parseFloat(row.interest_payment),
    totalPayment: parseFloat(row.total_payment),
    remainingBalance: parseFloat(row.remaining_balance),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('loan_schedules')
      .select('*')
      .eq('loan_id', id)
      .order('month', { ascending: true });

    if (error) throw error;

    const schedule: LoanScheduleEntry[] = (data || []).map(transformScheduleEntry);

    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error('Error fetching loan schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan schedule', details: error.message },
      { status: 500 }
    );
  }
}

