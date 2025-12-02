// Generate Loan Schedule API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { calculateLoanSchedule } from '@/lib/calculations/loans';
import type { Loan, LoanScheduleEntry } from '@kit/types';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformScheduleToSnakeCase(entry: LoanScheduleEntry): any {
  return {
    loan_id: entry.loanId,
    month: entry.month,
    payment_date: entry.paymentDate,
    principal_payment: entry.principalPayment,
    interest_payment: entry.interestPayment,
    total_payment: entry.totalPayment,
    remaining_balance: entry.remainingBalance,
    is_paid: entry.isPaid,
    paid_date: entry.paidDate,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    // Fetch loan
    const { data: loanData, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', id)
      .single();

    if (loanError) {
      if (loanError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
      }
      throw loanError;
    }

    const loan = transformLoan(loanData);

    // Calculate schedule
    const schedule = calculateLoanSchedule(loan);

    // Delete existing schedule entries
    await supabase
      .from('loan_schedules')
      .delete()
      .eq('loan_id', id);

    // Insert new schedule entries
    const scheduleData = schedule.map(transformScheduleToSnakeCase);
    const { data: insertedSchedule, error: insertError } = await supabase
      .from('loan_schedules')
      .insert(scheduleData)
      .select();

    if (insertError) throw insertError;

    // Create OUTPUT entries for each loan payment schedule entry
    if (insertedSchedule && insertedSchedule.length > 0) {
      const entryData = insertedSchedule.map((scheduleEntry: any) => ({
        direction: 'output',
        entry_type: 'loan_payment',
        name: `${loan.name} - Payment Month ${scheduleEntry.month}`,
        amount: scheduleEntry.total_payment,
        description: `Principal: ${scheduleEntry.principal_payment}, Interest: ${scheduleEntry.interest_payment}`,
        entry_date: scheduleEntry.payment_date,
        due_date: scheduleEntry.payment_date,
        reference_id: parseInt(id),
        schedule_entry_id: scheduleEntry.id,
        is_active: true,
      }));

      const { error: entryError } = await supabase
        .from('entries')
        .insert(entryData);

      if (entryError) {
        console.error('Error creating entries for loan schedule:', entryError);
        // Don't fail the schedule generation if entry creation fails, but log it
      }
    }

    return NextResponse.json(insertedSchedule, { status: 201 });
  } catch (error: any) {
    console.error('Error generating loan schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate loan schedule', details: error.message },
      { status: 500 }
    );
  }
}

