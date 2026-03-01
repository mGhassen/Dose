// Bulk Loan Schedules API Route
// Fetches loan schedules across all loans for a date range

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { LoanScheduleEntry } from '@kit/types';

export interface LoanScheduleEntryWithLoan extends LoanScheduleEntry {
  loanName: string;
  loanNumber: string;
  offPaymentMonths?: number[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');

    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultEnd = new Date(now);
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
    const defaultEndStr = `${defaultEnd.getFullYear()}-${String(defaultEnd.getMonth() + 1).padStart(2, '0')}`;

    const start = startMonth || defaultStart;
    const end = endMonth || defaultEndStr;

    const startDate = `${start}-01`;
    const endDateObj = new Date(`${end}-01`);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    endDateObj.setDate(0);
    const endDate = endDateObj.toISOString().split('T')[0];

    const supabase = createServerSupabaseClient();

    const { data: scheduleRows, error } = await supabase
      .from('loan_schedules')
      .select('*')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date', { ascending: true });

    if (error) throw error;

    const loanIds = [...new Set((scheduleRows || []).map((r: any) => r.loan_id))];
    const loansMap = new Map<number, { name: string; loan_number: string; off_payment_months: number[] }>();

    if (loanIds.length > 0) {
      const { data: loansData } = await supabase
        .from('loans')
        .select('id, name, loan_number, off_payment_months')
        .in('id', loanIds);
      (loansData || []).forEach((l: any) => {
        loansMap.set(l.id, {
          name: l.name,
          loan_number: l.loan_number,
          off_payment_months: l.off_payment_months || [],
        });
      });
    }

    const { data: entriesData } = await supabase
      .from('entries')
      .select('id, schedule_entry_id, reference_id')
      .eq('entry_type', 'loan_payment')
      .eq('direction', 'output')
      .in('reference_id', loanIds);

    const scheduleEntryToEntriesMap = new Map<number, number[]>();
    (entriesData || []).forEach((e: any) => {
      if (e.schedule_entry_id) {
        if (!scheduleEntryToEntriesMap.has(e.schedule_entry_id)) {
          scheduleEntryToEntriesMap.set(e.schedule_entry_id, []);
        }
        scheduleEntryToEntriesMap.get(e.schedule_entry_id)!.push(e.id);
      }
    });

    const allEntryIds = Array.from(new Set(Array.from(scheduleEntryToEntriesMap.values()).flat()));
    const entryPaymentsMap = new Map<number, number>();

    if (allEntryIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('entry_id, amount, is_paid')
        .in('entry_id', allEntryIds)
        .eq('is_paid', true);

      (paymentsData || []).forEach((p: any) => {
        const current = entryPaymentsMap.get(p.entry_id) || 0;
        entryPaymentsMap.set(p.entry_id, current + parseFloat(p.amount));
      });
    }

    const schedules: LoanScheduleEntryWithLoan[] = (scheduleRows || []).map((row: any) => {
      const entryIds = scheduleEntryToEntriesMap.get(row.id) || [];
      const totalPaid = entryIds.reduce((sum, entryId) => sum + (entryPaymentsMap.get(entryId) || 0), 0);
      const totalPayment = parseFloat(row.total_payment);
      const isPaid = totalPaid >= totalPayment;

      return {
        id: row.id,
        loanId: row.loan_id,
        month: row.month,
        paymentDate: row.payment_date,
        principalPayment: parseFloat(row.principal_payment),
        interestPayment: parseFloat(row.interest_payment),
        totalPayment,
        remainingBalance: parseFloat(row.remaining_balance),
        isPaid,
        paidDate: isPaid && totalPaid > 0 ? row.paid_date : undefined,
        loanName: loansMap.get(row.loan_id)?.name || '',
        loanNumber: loansMap.get(row.loan_id)?.loan_number || '',
        offPaymentMonths: loansMap.get(row.loan_id)?.off_payment_months || [],
      };
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error('Error fetching loan schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan schedules', details: error.message },
      { status: 500 }
    );
  }
}
