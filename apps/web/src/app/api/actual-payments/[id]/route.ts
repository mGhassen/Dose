// Update/Delete Actual Payment API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ActualPayment, CreateActualPaymentData } from '../route';

function transformActualPayment(row: any): ActualPayment {
  return {
    id: row.id,
    paymentType: row.payment_type,
    referenceId: row.reference_id,
    scheduleEntryId: row.schedule_entry_id,
    month: row.month,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const supabase = createServerSupabaseClient();
    
    const updateData: any = {};
    if (body.paymentDate !== undefined) updateData.payment_date = body.paymentDate;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.isPaid !== undefined) {
      updateData.is_paid = body.isPaid;
      if (body.isPaid && !body.paidDate) {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else if (!body.isPaid) {
        updateData.paid_date = null;
      }
    }
    if (body.paidDate !== undefined) updateData.paid_date = body.paidDate || null;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('actual_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Actual payment not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformActualPayment(data));
  } catch (error: any) {
    console.error('Error updating actual payment:', error);
    return NextResponse.json(
      { error: 'Failed to update actual payment', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { error } = await supabase
      .from('actual_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting actual payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete actual payment', details: error.message },
      { status: 500 }
    );
  }
}

