// Get Subscription Projection Entries API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

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
      .from('subscription_projection_entries')
      .select('*')
      .eq('subscription_id', id)
      .order('month', { ascending: true });

    if (startMonth) {
      query = query.gte('month', startMonth);
    }
    if (endMonth) {
      query = query.lte('month', endMonth);
    }

    const { data, error } = await query;

    if (error) throw error;

    const entries = (data || []).map(transformProjectionEntry);

    return NextResponse.json(entries);
  } catch (error: any) {
    console.error('Error fetching subscription projections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription projections', details: error.message },
      { status: 500 }
    );
  }
}

// Create or update a projection entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.month || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: month, amount' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Check if entry already exists
    const { data: existing } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('subscription_id', id)
      .eq('month', body.month)
      .maybeSingle();

    let projectionEntry;
    
    if (existing) {
      // Update existing entry
      const { data, error } = await supabase
        .from('subscription_projection_entries')
        .update({
          amount: body.amount,
          is_projected: body.isProjected !== undefined ? body.isProjected : existing.is_projected,
          is_paid: body.isPaid !== undefined ? body.isPaid : existing.is_paid,
          paid_date: body.paidDate !== undefined ? body.paidDate : existing.paid_date,
          actual_amount: body.actualAmount !== undefined ? body.actualAmount : existing.actual_amount,
          notes: body.notes !== undefined ? body.notes : existing.notes,
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      projectionEntry = data;
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('subscription_projection_entries')
        .insert({
          subscription_id: parseInt(id),
          month: body.month,
          amount: body.amount,
          is_projected: body.isProjected !== undefined ? body.isProjected : true,
          is_paid: body.isPaid || false,
          paid_date: body.paidDate || null,
          actual_amount: body.actualAmount || null,
          notes: body.notes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      projectionEntry = data;
      
      // Always create the entry for the projection (needed for payments, even partial ones)
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (subscriptionData) {
        // Check if entry already exists
        const { data: existingEntry } = await supabase
          .from('entries')
          .select('id')
          .eq('reference_id', parseInt(id))
          .eq('schedule_entry_id', projectionEntry.id)
          .eq('entry_type', 'subscription_payment')
          .maybeSingle();

        if (!existingEntry) {
          // Create OUTPUT entry
          const { data: entryData, error: entryError } = await supabase
            .from('entries')
            .insert({
              direction: 'output',
              entry_type: 'subscription_payment',
              name: `${subscriptionData.name} - ${body.month}`,
              amount: body.actualAmount || body.amount,
              description: body.notes || `Subscription payment for ${body.month}`,
              category: subscriptionData.category,
              vendor: subscriptionData.vendor,
              entry_date: body.paidDate || `${body.month}-01`,
              due_date: body.paidDate || `${body.month}-01`,
              reference_id: parseInt(id),
              schedule_entry_id: projectionEntry.id,
              is_active: subscriptionData.is_active,
            })
            .select()
            .single();

          if (entryError) {
            console.error('Error creating entry for subscription projection:', entryError);
            // Continue even if entry creation fails
          }

          // If payment is marked as paid, create payment and expense
          if (entryData && body.isPaid && body.paidDate) {
            // Create payment
            await supabase
              .from('payments')
              .insert({
                entry_id: entryData.id,
                payment_date: body.paidDate,
                amount: body.actualAmount || body.amount,
                is_paid: true,
                paid_date: body.paidDate,
                notes: body.notes || null,
              });

            // Create expense entry
            await supabase
              .from('expenses')
              .insert({
                name: `${subscriptionData.name} - ${body.month}`,
                category: subscriptionData.category,
                amount: body.actualAmount || body.amount,
                subscription_id: parseInt(id),
                expense_date: body.paidDate || `${body.month}-01`,
                description: body.notes || `Payment for subscription: ${subscriptionData.name} - ${body.month}`,
                vendor: subscriptionData.vendor || null,
                recurrence: 'one_time',
                start_date: body.paidDate || `${body.month}-01`,
                is_active: true,
              });
          }
        }
      }
    }

    return NextResponse.json(transformProjectionEntry(projectionEntry));
  } catch (error: any) {
    console.error('Error creating/updating subscription projection entry:', error);
    return NextResponse.json(
      { error: 'Failed to create/update subscription projection entry', details: error.message },
      { status: 500 }
    );
  }
}
