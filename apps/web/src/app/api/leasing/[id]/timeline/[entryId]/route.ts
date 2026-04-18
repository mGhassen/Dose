// Update Leasing Timeline Entry API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const body = await request.json();
    
    const supabase = supabaseServer();
    
    const updateData: any = {};
    if (body.paymentDate !== undefined) updateData.payment_date = body.paymentDate;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.actualAmount !== undefined) updateData.actual_amount = body.actualAmount || null;
    if (body.isProjected !== undefined) updateData.is_projected = body.isProjected;
    if (body.isFixedAmount !== undefined) updateData.is_fixed_amount = body.isFixedAmount;
    if (body.isPaid !== undefined) {
      updateData.is_paid = body.isPaid;
      if (body.isPaid && !body.paidDate) {
        updateData.paid_date = (await import('@kit/lib')).dateToYYYYMMDD(new Date());
      } else if (!body.isPaid) {
        updateData.paid_date = null;
      }
    }
    if (body.paidDate !== undefined) updateData.paid_date = body.paidDate || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('leasing_timeline_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('leasing_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });
      }
      throw error;
    }

    const entryPatch: Record<string, unknown> = {};
    if (updateData.amount !== undefined) entryPatch.amount = updateData.amount;
    if (updateData.payment_date !== undefined) {
      entryPatch.entry_date = updateData.payment_date;
      entryPatch.due_date = updateData.payment_date;
    }
    if (Object.keys(entryPatch).length > 0) {
      await supabase
        .from('entries')
        .update(entryPatch)
        .eq('entry_type', 'leasing_payment')
        .eq('reference_id', parseInt(id))
        .eq('schedule_entry_id', parseInt(entryId));
    }

    return NextResponse.json(transformTimelineEntry(data));
  } catch (error: any) {
    console.error('Error updating leasing timeline entry:', error);
    return NextResponse.json(
      { error: 'Failed to update leasing timeline entry', details: error.message },
      { status: 500 }
    );
  }
}

