// Generate and Store Leasing Timeline API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { projectLeasingPayment } from '@/lib/calculations/leasing-timeline';
import type { LeasingPayment } from '@kit/types';

function transformLeasing(row: any): LeasingPayment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    description: row.description,
    lessor: row.lessor,
    isActive: row.is_active,
    offPaymentMonths: row.off_payment_months || [],
    firstPaymentAmount: row.first_payment_amount ? parseFloat(row.first_payment_amount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('startMonth') || new Date().toISOString().slice(0, 7);
    const endMonth = searchParams.get('endMonth') || (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().slice(0, 7);
    })();
    
    const supabase = createServerSupabaseClient();
    
    // Fetch leasing payment
    const { data: leasingData, error: leasingError } = await supabase
      .from('leasing_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (leasingError) {
      if (leasingError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leasing payment not found' }, { status: 404 });
      }
      throw leasingError;
    }

    const leasing = transformLeasing(leasingData);

    // Calculate timeline entries
    const timelineEntries = projectLeasingPayment(leasing, startMonth, endMonth);

    // Delete existing timeline entries for this leasing
    await supabase
      .from('leasing_timeline_entries')
      .delete()
      .eq('leasing_id', id);

    // Insert new timeline entries
    const timelineData = timelineEntries.map(entry => ({
      leasing_id: entry.leasingId,
      month: entry.month,
      payment_date: entry.paymentDate.split('T')[0],
      amount: entry.amount,
      is_projected: entry.isProjected,
      is_paid: false,
      paid_date: null,
      actual_amount: null,
      notes: null,
    }));

    const { data: insertedTimeline, error: insertError } = await supabase
      .from('leasing_timeline_entries')
      .insert(timelineData)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json(insertedTimeline, { status: 201 });
  } catch (error: any) {
    console.error('Error generating leasing timeline:', error);
    return NextResponse.json(
      { error: 'Failed to generate leasing timeline', details: error.message },
      { status: 500 }
    );
  }
}

