// Bulk Leasing Schedules API Route
// Mirrors /api/loans/schedules: fetches leasing_timeline_entries for a date range,
// enriches them with leasing name/type and derives is_paid from `payments`.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

export interface LeasingScheduleEntry {
  id: number;
  leasingId: number;
  leasingName: string;
  leasingType: string;
  lessor?: string | null;
  month: string;
  paymentDate: string;
  amount: number;
  isProjected: boolean;
  isFixedAmount: boolean;
  isPaid: boolean;
  paidDate?: string | null;
  entryId: number | null;
  totalPaid: number;
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

    const supabase = supabaseServer();

    const { data: timelineRows, error } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .gte('month', start)
      .lte('month', end)
      .order('payment_date', { ascending: true });

    if (error) throw error;

    const leasingIds = [...new Set((timelineRows || []).map((r: any) => r.leasing_id))];
    const leasingMap = new Map<number, { name: string; type: string; lessor: string | null }>();

    if (leasingIds.length > 0) {
      const { data: leasingData } = await supabase
        .from('leasing_payments')
        .select('id, name, type, lessor')
        .in('id', leasingIds);
      (leasingData || []).forEach((l: any) => {
        leasingMap.set(l.id, { name: l.name, type: l.type, lessor: l.lessor ?? null });
      });
    }

    const timelineIds = (timelineRows || []).map((r: any) => r.id);
    const scheduleToEntryId = new Map<number, number>();
    if (timelineIds.length > 0) {
      const { data: ledgerRows } = await supabase
        .from('entries')
        .select('id, schedule_entry_id')
        .eq('entry_type', 'leasing_payment')
        .in('schedule_entry_id', timelineIds);
      (ledgerRows || []).forEach((e: any) => {
        if (e.schedule_entry_id != null) scheduleToEntryId.set(e.schedule_entry_id, e.id);
      });
    }

    const ledgerEntryIds = Array.from(scheduleToEntryId.values());
    const paidByEntryId = new Map<number, number>();
    if (ledgerEntryIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('entry_id, amount, is_paid')
        .in('entry_id', ledgerEntryIds)
        .eq('is_paid', true);
      (paymentsData || []).forEach((p: any) => {
        const cur = paidByEntryId.get(p.entry_id) || 0;
        paidByEntryId.set(p.entry_id, cur + parseFloat(p.amount));
      });
    }

    const schedules: LeasingScheduleEntry[] = (timelineRows || []).map((row: any) => {
      const entryId = scheduleToEntryId.get(row.id) ?? null;
      const totalPaid = entryId != null ? (paidByEntryId.get(entryId) || 0) : 0;
      const amount = parseFloat(row.amount);
      const lease = leasingMap.get(row.leasing_id);
      return {
        id: row.id,
        leasingId: row.leasing_id,
        leasingName: lease?.name || '',
        leasingType: lease?.type || '',
        lessor: lease?.lessor ?? null,
        month: row.month,
        paymentDate: row.payment_date,
        amount,
        isProjected: row.is_projected,
        isFixedAmount: row.is_fixed_amount || false,
        isPaid: row.is_paid || totalPaid >= amount,
        paidDate: row.paid_date ?? null,
        entryId,
        totalPaid,
      };
    });

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error('Error fetching leasing schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leasing schedules', details: error.message },
      { status: 500 }
    );
  }
}
