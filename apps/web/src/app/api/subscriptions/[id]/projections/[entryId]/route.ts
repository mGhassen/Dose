// Update Subscription Projection Entry API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

export interface UpdateSubscriptionProjectionEntryData {
  isPaid?: boolean;
  paidDate?: string | null;
  actualAmount?: number | null;
  notes?: string | null;
}

function transformProjectionEntry(row: any) {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
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

function transformToSnakeCase(data: UpdateSubscriptionProjectionEntryData): any {
  const result: any = {};
  if ('isPaid' in data) result.is_paid = data.isPaid;
  if ('paidDate' in data) result.paid_date = data.paidDate || null;
  if ('actualAmount' in data) result.actual_amount = data.actualAmount !== undefined ? data.actualAmount : null;
  if ('notes' in data) result.notes = data.notes || null;
  return result;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const body: UpdateSubscriptionProjectionEntryData = await request.json();

    const supabase = createServerSupabaseClient();
    
    // Verify the projection entry belongs to this subscription
    const { data: existingEntry, error: checkError } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('id', entryId)
      .eq('subscription_id', id)
      .single();

    if (checkError || !existingEntry) {
      return NextResponse.json(
        { error: 'Subscription projection entry not found' },
        { status: 404 }
      );
    }

    // Update the projection entry
    const { data, error } = await supabase
      .from('subscription_projection_entries')
      .update(transformToSnakeCase(body))
      .eq('id', entryId)
      .eq('subscription_id', id)
      .select()
      .single();

    if (error) throw error;

    // Update corresponding entry if it exists
    if (data) {
      const { data: entryData, error: entryError } = await supabase
        .from('entries')
        .select('id')
        .eq('reference_id', parseInt(id))
        .eq('schedule_entry_id', parseInt(entryId))
        .eq('entry_type', 'subscription_payment')
        .maybeSingle();

      if (!entryError && entryData) {
        // Update the entry's payment status
        // Only create payment if paidDate is provided AND no payments exist yet
        // This prevents duplicate payments when payments are managed separately
        if (body.isPaid !== undefined) {
          if (body.isPaid && body.paidDate) {
            // Check if any payments already exist for this entry
            const { data: existingPayments } = await supabase
              .from('payments')
              .select('id')
              .eq('entry_id', entryData.id);

            // Only create a payment if none exist (for backward compatibility with old flow)
            if (!existingPayments || existingPayments.length === 0) {
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
                    amount: body.actualAmount || parseFloat(existingEntry.amount),
                    is_paid: true,
                    paid_date: body.paidDate,
                    notes: body.notes || null,
                  });
              }
            }

            // Create an expense entry when subscription payment is marked as paid
            const { data: subscriptionData } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('id', parseInt(id))
              .single();

            if (subscriptionData) {
              const expenseData = {
                name: `${subscriptionData.name} - ${data.month}`,
                category: subscriptionData.category,
                amount: body.actualAmount || parseFloat(existingEntry.amount),
                subscription_id: parseInt(id),
                expense_date: body.paidDate || data.month + '-01',
                description: body.notes || `Payment for subscription: ${subscriptionData.name} - ${data.month}`,
                vendor: subscriptionData.vendor || null,
                recurrence: 'one_time', // Expenses are always one-time
                start_date: body.paidDate || data.month + '-01',
                is_active: true,
              };

              const { error: expenseError } = await supabase
                .from('expenses')
                .insert(expenseData);

              if (expenseError) {
                console.error('Error creating expense for subscription payment:', expenseError);
                // Don't fail the update if expense creation fails
              }
            }
          } else if (!body.isPaid) {
            // If payment is marked as unpaid, delete the associated expense and payment
            // Find the expense that was created for this subscription payment
            // The expense should match the subscription_id and the paid_date/month
            const paidDate = existingEntry.paid_date || data.month + '-01';
            const { data: expenses } = await supabase
              .from('expenses')
              .select('id')
              .eq('subscription_id', parseInt(id))
              .eq('expense_date', paidDate)
              .maybeSingle();

            if (expenses) {
              // Delete the expense
              const { error: expenseDeleteError } = await supabase
                .from('expenses')
                .delete()
                .eq('id', expenses.id);

              if (expenseDeleteError) {
                console.error('Error deleting expense:', expenseDeleteError);
              }
            }

            // Delete the payment(s) associated with this entry
            const { data: payments } = await supabase
              .from('payments')
              .select('id')
              .eq('entry_id', entryData.id);

            if (payments && payments.length > 0) {
              for (const payment of payments) {
                const { error: paymentDeleteError } = await supabase
                  .from('payments')
                  .delete()
                  .eq('id', payment.id);

                if (paymentDeleteError) {
                  console.error('Error deleting payment:', paymentDeleteError);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json(transformProjectionEntry(data));
  } catch (error: any) {
    console.error('Error updating subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;

    const supabase = createServerSupabaseClient();
    
    // Verify the projection entry belongs to this subscription
    const { data: existingEntry } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('id', entryId)
      .eq('subscription_id', id)
      .single();

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Subscription projection entry not found' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('subscription_projection_entries')
      .delete()
      .eq('id', entryId)
      .eq('subscription_id', id);

    if (error) throw error;

    // Delete corresponding entry if it exists
    const { data: entryData } = await supabase
      .from('entries')
      .select('id')
      .eq('reference_id', parseInt(id))
      .eq('schedule_entry_id', parseInt(entryId))
      .eq('entry_type', 'subscription_payment')
      .maybeSingle();

    if (entryData) {
      await supabase
        .from('entries')
        .delete()
        .eq('id', entryData.id);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}

