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

    // Fetch existing entries to preserve fixed amounts and payment data
    const { data: existingEntries, error: existingError } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('leasing_id', id)
      .gte('month', startMonth)
      .lte('month', endMonth);

    if (existingError) throw existingError;

    // Create a map of existing entries by month and payment_date for quick lookup
    const existingMap = new Map<string, any>();
    (existingEntries || []).forEach((entry: any) => {
      const key = `${entry.month}-${entry.payment_date}`;
      existingMap.set(key, entry);
    });

    // Calculate timeline entries
    const timelineEntries = projectLeasingPayment(leasing, startMonth, endMonth);

    // Prepare entries to insert/update
    const entriesToUpsert: any[] = [];

    for (const entry of timelineEntries) {
      const key = `${entry.month}-${entry.paymentDate.split('T')[0]}`;
      const existing = existingMap.get(key);

      if (existing) {
        // Entry exists - preserve fixed amounts and payment data
        entriesToUpsert.push({
          id: existing.id,
          leasing_id: entry.leasingId,
          month: entry.month,
          payment_date: entry.paymentDate.split('T')[0],
          // Preserve existing amount if fixed, otherwise use calculated amount
          amount: existing.is_fixed_amount ? existing.amount : entry.amount,
          is_projected: entry.isProjected,
          is_fixed_amount: existing.is_fixed_amount || false,
          // Preserve payment data
          is_paid: existing.is_paid || false,
          paid_date: existing.paid_date || null,
          actual_amount: existing.actual_amount || null,
          notes: existing.notes || null,
        });
      } else {
        // New entry
        entriesToUpsert.push({
          leasing_id: entry.leasingId,
          month: entry.month,
          payment_date: entry.paymentDate.split('T')[0],
          amount: entry.amount,
          is_projected: entry.isProjected,
          is_fixed_amount: false,
          is_paid: false,
          paid_date: null,
          actual_amount: null,
          notes: null,
        });
      }
    }

    // Delete entries that are no longer in the calculated timeline (but preserve fixed ones outside range)
    const calculatedKeys = new Set(timelineEntries.map(e => `${e.month}-${e.paymentDate.split('T')[0]}`));
    const entriesToDelete = (existingEntries || []).filter((e: any) => {
      const key = `${e.month}-${e.payment_date}`;
      return !calculatedKeys.has(key) && !e.is_fixed_amount;
    });

    if (entriesToDelete.length > 0) {
      const idsToDelete = entriesToDelete.map((e: any) => e.id);
      await supabase
        .from('leasing_timeline_entries')
        .delete()
        .in('id', idsToDelete);
    }

    // Separate entries with IDs (updates) from entries without IDs (inserts)
    const entriesToUpdate = entriesToUpsert.filter(e => e.id);
    const entriesToInsert = entriesToUpsert.filter(e => !e.id);

    // Update existing entries
    if (entriesToUpdate.length > 0) {
      for (const entry of entriesToUpdate) {
        const { id, ...updateData } = entry;
        const { error: updateError } = await supabase
          .from('leasing_timeline_entries')
          .update(updateData)
          .eq('id', id);
        if (updateError) throw updateError;
      }
    }

    // Insert new entries
    let insertedTimeline: any[] = [];
    if (entriesToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('leasing_timeline_entries')
        .insert(entriesToInsert)
        .select();
      if (insertError) throw insertError;
      insertedTimeline = inserted || [];
    }

    // Fetch all entries to return
    const { data: allEntries, error: fetchError } = await supabase
      .from('leasing_timeline_entries')
      .select('*')
      .eq('leasing_id', id)
      .gte('month', startMonth)
      .lte('month', endMonth)
      .order('month', { ascending: true })
      .order('payment_date', { ascending: true });

    if (fetchError) throw fetchError;

    return NextResponse.json(allEntries || [], { status: 201 });
  } catch (error: any) {
    console.error('Error generating leasing timeline:', error);
    return NextResponse.json(
      { error: 'Failed to generate leasing timeline', details: error.message },
      { status: 500 }
    );
  }
}

