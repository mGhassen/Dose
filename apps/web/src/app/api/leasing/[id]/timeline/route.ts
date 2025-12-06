// Get Leasing Timeline Entries API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

function transformTimelineEntry(row: any) {
  return {
    id: row.id,
    leasingId: row.leasing_id,
    month: row.month,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isProjected: row.is_projected,
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    actualAmount: row.actual_amount ? parseFloat(row.actual_amount) : null,
    isFixedAmount: row.is_fixed_amount || false,
    notes: row.notes,
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
    
    const supabase = createServerSupabaseClient();
    
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

    const entries = (data || []).map(transformTimelineEntry);

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
    
    const supabase = createServerSupabaseClient();
    
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

    return NextResponse.json(transformTimelineEntry(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating leasing timeline entry:', error);
    return NextResponse.json(
      { error: 'Failed to create leasing timeline entry', details: error.message },
      { status: 500 }
    );
  }
}

