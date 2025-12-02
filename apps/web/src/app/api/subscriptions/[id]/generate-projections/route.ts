// Generate and Store Subscription Projections API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { projectSubscription } from '@/lib/calculations/subscription-projections';
import type { Subscription } from '@kit/types';

function transformSubscription(row: any): Subscription {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    recurrence: row.recurrence,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    vendor: row.vendor,
    isActive: row.is_active,
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
    
    // Fetch subscription
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (subscriptionError) {
      if (subscriptionError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      throw subscriptionError;
    }

    const subscription = transformSubscription(subscriptionData);

    // Calculate projections
    const projections = projectSubscription(subscription, startMonth, endMonth);

    // Delete existing projections for this subscription
    await supabase
      .from('subscription_projection_entries')
      .delete()
      .eq('subscription_id', id);

    // Insert new projections
    const projectionData = projections.map(proj => ({
      subscription_id: proj.subscriptionId,
      month: proj.month,
      amount: proj.amount,
      is_projected: proj.isProjected,
      is_paid: false,
      paid_date: null,
      actual_amount: null,
      notes: null,
    }));

    const { data: insertedProjections, error: insertError } = await supabase
      .from('subscription_projection_entries')
      .insert(projectionData)
      .select();

    if (insertError) throw insertError;

    // Create OUTPUT entries for each projection entry
    if (insertedProjections && insertedProjections.length > 0) {
      const entryData = insertedProjections.map((proj: any) => ({
        direction: 'output',
        entry_type: 'subscription_payment',
        name: `${subscription.name} - ${proj.month}`,
        amount: proj.amount,
        description: `Subscription payment for ${proj.month}`,
        category: subscription.category,
        vendor: subscription.vendor,
        entry_date: `${proj.month}-01`,
        due_date: `${proj.month}-01`,
        reference_id: parseInt(id),
        schedule_entry_id: proj.id,
        is_active: subscription.isActive,
      }));

      const { error: entryError } = await supabase
        .from('entries')
        .insert(entryData);

      if (entryError) {
        console.error('Error creating entries for subscription projections:', entryError);
        // Don't fail the projection creation if entry creation fails, but log it
      }
    }

    return NextResponse.json(insertedProjections, { status: 201 });
  } catch (error: any) {
    console.error('Error generating subscription projections:', error);
    return NextResponse.json(
      { error: 'Failed to generate subscription projections', details: error.message },
      { status: 500 }
    );
  }
}

