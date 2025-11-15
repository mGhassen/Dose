// Update Expense Projection Entry API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

function transformProjectionEntry(row: any) {
  return {
    id: row.id,
    expenseId: row.expense_id,
    month: row.month,
    amount: parseFloat(row.amount),
    isProjected: row.is_projected,
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    actualAmount: row.actual_amount ? parseFloat(row.actual_amount) : null,
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
    
    const supabase = createServerSupabaseClient();
    
    const updateData: any = {};
    if (body.month !== undefined) updateData.month = body.month;
    if (body.amount !== undefined) updateData.amount = body.amount;
    if (body.actualAmount !== undefined) updateData.actual_amount = body.actualAmount || null;
    if (body.isProjected !== undefined) updateData.is_projected = body.isProjected;
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
      .from('expense_projection_entries')
      .update(updateData)
      .eq('id', entryId)
      .eq('expense_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Projection entry not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformProjectionEntry(data));
  } catch (error: any) {
    console.error('Error updating expense projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to update expense projection entry', details: error.message },
      { status: 500 }
    );
  }
}

