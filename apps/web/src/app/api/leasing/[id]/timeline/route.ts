// Get Leasing Timeline Entries API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

function transformTimelineEntry(row: any, entryId: number | null, totalPaid: number) {
  const amount = parseFloat(row.amount);
  const isPaid = row.is_paid || totalPaid >= amount;
  return {
    id: row.id,
    leasingId: row.leasing_id,
    month: row.month,
    paymentDate: row.payment_date,
    amount,
    isProjected: row.is_projected,
    isPaid,
    paidDate: row.paid_date,
    actualAmount: row.actual_amount ? parseFloat(row.actual_amount) : null,
    isFixedAmount: row.is_fixed_amount || false,
    notes: row.notes,
    entryId,
    totalPaid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');
    
    const supabase = supabaseServer();
    
    let query = supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('leasing_id', id)
      .order('month', { ascending: true })
      .order('payment_date', { ascending: true });

    if (startMonth) {
      query = query.gte('month', startMonth);
    }
    if (endMonth) {
      query = query.lte('month', endMonth);
    }

    const { data, error } = await query;

    if (error) throw error;

    const timelineRows = data || [];
    const timelineIds = timelineRows.map((r: any) => r.id);

    const scheduleToEntryId = new Map<number, number>();
    let ledgerEntryIds: number[] = [];
    if (timelineIds.length > 0) {
      const { data: ledgerRows } = await supabase
        .from('entries')
        .select('id, schedule_entry_id')
        .eq('entry_type', 'leasing_payment')
        .eq('reference_id', parseInt(id))
        .in('schedule_entry_id', timelineIds);
      (ledgerRows || []).forEach((e: any) => {
        if (e.schedule_entry_id != null) scheduleToEntryId.set(e.schedule_entry_id, e.id);
      });
      ledgerEntryIds = Array.from(scheduleToEntryId.values());
    }

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

    const entries = timelineRows.map((row: any) => {
      const entryId = scheduleToEntryId.get(row.id) ?? null;
      const totalPaid = entryId != null ? (paidByEntryId.get(entryId) || 0) : 0;
      return transformTimelineEntry(row, entryId, totalPaid);
    });

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching leasing timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leasing timeline', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const supabase = supabaseServer();
    
    const insertData: any = {
      leasing_id: parseInt(id),
      month: body.month,
      payment_date: body.paymentDate,
      amount: body.amount,
      is_projected: body.isProjected !== undefined ? body.isProjected : true,
      is_fixed_amount: body.isFixedAmount || false,
    };
    
    const { data, error } = await supabase
      .from('leasing_timeline_entries')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    const { data: leasingRow } = await supabase
      .from('leasing_payments')
      .select('name')
      .eq('id', id)
      .single();

    const { data: insertedEntry } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: 'leasing_payment',
        name: `${leasingRow?.name ?? 'Leasing'} - ${data.month}`,
        amount: data.amount,
        entry_date: data.payment_date,
        due_date: data.payment_date,
        reference_id: parseInt(id),
        schedule_entry_id: data.id,
        is_active: true,
      })
      .select('id')
      .single();

    return NextResponse.json(transformTimelineEntry(data, insertedEntry?.id ?? null, 0), { status: 201 });
  } catch (error: any) {
    console.error('Error creating leasing timeline entry:', error);
    return NextResponse.json(
      { error: 'Failed to create leasing timeline entry', details: error.message },
      { status: 500 }
    );
  }
}

