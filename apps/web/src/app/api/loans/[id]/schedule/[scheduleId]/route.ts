// Update Loan Schedule Entry API Route

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;
    const body = await request.json();
    
    const supabase = createServerSupabaseClient();
    
    // Build update object
    const updateData: any = {};
    if (body.paymentDate !== undefined) updateData.payment_date = body.paymentDate;
    if (body.principalPayment !== undefined) updateData.principal_payment = body.principalPayment;
    if (body.interestPayment !== undefined) updateData.interest_payment = body.interestPayment;
    if (body.totalPayment !== undefined) updateData.total_payment = body.totalPayment;
    if (body.remainingBalance !== undefined) updateData.remaining_balance = body.remainingBalance;
    if (body.isPaid !== undefined) {
      updateData.is_paid = body.isPaid;
      if (body.isPaid && !body.paidDate) {
        // Auto-set paid date if marking as paid
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else if (!body.isPaid) {
        updateData.paid_date = null;
      }
    }
    if (body.paidDate !== undefined) updateData.paid_date = body.paidDate || null;
    
    const { data, error } = await supabase
      .from('loan_schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('loan_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Schedule entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformScheduleEntry(data));
  } catch (error: any) {
    console.error('Error updating loan schedule entry:', error);
    return NextResponse.json(
      { error: 'Failed to update loan schedule entry', details: error.message },
      { status: 500 }
    );
  }
}

