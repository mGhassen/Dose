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
        .single();

      if (!entryError && entryData) {
        // Update the entry's payment status
        const entryUpdate: any = {};
        if (body.isPaid !== undefined) {
          // Find or create payment for this entry
          if (body.isPaid && body.paidDate) {
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

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}

