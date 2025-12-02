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

    // Update corresponding entry if it exists
    if (data) {
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .select('id')
        .eq('reference_id', parseInt(id))
        .eq('schedule_entry_id', parseInt(entryId))
        .eq('entry_type', 'expense_payment')
        .maybeSingle();

      if (!entryError && entryData) {
        // Update the entry's payment status
        if (body.isPaid !== undefined && body.isPaid && body.paidDate) {
          // Find or create payment for this entry
          const { data: payments } = await supabase
            .from('payments')
            .select('id')
            .eq('entry_id', entryData.id)
            .eq('payment_date', body.paidDate)
            .maybeSingle();

          if (!payments) {
            await supabase
              .from('payments')
              .insert({
                entry_id: entryData.id,
                payment_date: body.paidDate,
                amount: body.actualAmount || parseFloat(data.amount),
                is_paid: true,
                paid_date: body.paidDate,
                notes: body.notes || null,
              });
          }

          // Create an expense entry when expense projection payment is marked as paid
          // (This is for one-time expenses with projections, not subscriptions)
          const { data: expenseData } = await supabase
            .from('expenses')
            .select('*')
            .eq('id', parseInt(id))
            .single();

          if (expenseData && !expenseData.subscription_id) {
            // Only create expense if it doesn't already exist for this projection
            const { data: existingExpense } = await supabase
              .from('expenses')
              .select('id')
              .eq('subscription_id', null)
              .eq('expense_date', body.paidDate)
              .ilike('name', `%${expenseData.name}%`)
              .maybeSingle();

            if (!existingExpense) {
              const newExpenseData = {
                name: `${expenseData.name} - ${data.month}`,
                category: expenseData.category,
                amount: body.actualAmount || parseFloat(existingEntry.amount),
                subscription_id: null, // One-time expense, not linked to subscription
                expense_date: body.paidDate || data.month + '-01',
                description: body.notes || `Payment for expense: ${expenseData.name} - ${data.month}`,
                vendor: expenseData.vendor || null,
                recurrence: 'one_time',
                start_date: body.paidDate || data.month + '-01',
                is_active: true,
              };

              const { error: expenseError } = await supabase
                .from('expenses')
                .insert(newExpenseData);

              if (expenseError) {
                console.error('Error creating expense for expense projection payment:', expenseError);
                // Don't fail the update if expense creation fails
              }
            }
          }
        }
      }
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

