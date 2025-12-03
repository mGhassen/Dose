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
    
    // Fetch schedule entries
    const { data, error } = await supabase
      .from('loan_schedules')
      .select('*')
      .eq('loan_id', id)
      .order('month', { ascending: true });

    if (error) throw error;

    // Fetch all entries for this loan
    const { data: entriesData } = await supabase
      .from('entries')
      .select('id, schedule_entry_id, amount')
      .eq('reference_id', parseInt(id))
      .eq('entry_type', 'loan_payment')
      .eq('direction', 'output');

    // Map schedule_entry_id to array of entry IDs (in case of duplicates)
    const scheduleEntryToEntriesMap = new Map<number, number[]>();
    (entriesData || []).forEach((e: any) => {
      if (e.schedule_entry_id) {
        if (!scheduleEntryToEntriesMap.has(e.schedule_entry_id)) {
          scheduleEntryToEntriesMap.set(e.schedule_entry_id, []);
        }
        scheduleEntryToEntriesMap.get(e.schedule_entry_id)!.push(e.id);
      }
    });

    // Get all unique entry IDs
    const allEntryIds = Array.from(new Set(Array.from(scheduleEntryToEntriesMap.values()).flat()));
    let entryPaymentsMap = new Map<number, number>(); // Map: entryId -> totalPaid
    
    if (allEntryIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, entry_id, amount, is_paid')
        .in('entry_id', allEntryIds)
        .eq('is_paid', true);

      // Calculate total paid per entry
      (paymentsData || []).forEach((p: any) => {
        const current = entryPaymentsMap.get(p.entry_id) || 0;
        entryPaymentsMap.set(p.entry_id, current + parseFloat(p.amount));
      });
    }

    // Transform schedule entries and calculate isPaid from payments
    const schedule: LoanScheduleEntry[] = (data || []).map((row: any) => {
      // Get all entry IDs for this schedule entry (in case of duplicates)
      const entryIds = scheduleEntryToEntriesMap.get(row.id) || [];
      // Sum up payments for all entries associated with this schedule entry
      const totalPaid = entryIds.reduce((sum, entryId) => {
        return sum + (entryPaymentsMap.get(entryId) || 0);
      }, 0);
      const totalPayment = parseFloat(row.total_payment);
      const isPaid = totalPaid >= totalPayment;
      
      return {
        id: row.id,
        loanId: row.loan_id,
        month: row.month,
        paymentDate: row.payment_date,
        principalPayment: parseFloat(row.principal_payment),
        interestPayment: parseFloat(row.interest_payment),
        totalPayment: totalPayment,
        remainingBalance: parseFloat(row.remaining_balance),
        isPaid: isPaid, // Calculate from payments, not from stored value
        paidDate: isPaid && totalPaid > 0 ? row.paid_date : undefined,
      };
    });

    return NextResponse.json(schedule);
  } catch (error: any) {
    console.error('Error fetching loan schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan schedule', details: error.message },
      { status: 500 }
    );
  }
}

