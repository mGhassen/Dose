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

    // Get existing projections to preserve payment data
    const { data: existingProjections } = await supabase
      .from('subscription_projection_entries')
      .select('*')
      .eq('subscription_id', id)
      .gte('month', startMonth)
      .lte('month', endMonth);

    const existingMap = new Map(
      (existingProjections || []).map((p: any) => [p.month, p])
    );

    // Prepare projection data, preserving existing payment info
    const projectionData = projections.map(proj => {
      const existing = existingMap.get(proj.month);
      return {
        subscription_id: proj.subscriptionId,
        month: proj.month,
        amount: proj.amount,
        is_projected: proj.isProjected,
        // Preserve existing payment data if it exists
        is_paid: existing?.is_paid || false,
        paid_date: existing?.paid_date || null,
        actual_amount: existing?.actual_amount || null,
        notes: existing?.notes || null,
      };
    });

    // Use upsert to handle conflicts (update amount/projected status, preserve payment data)
    const { data: insertedProjections, error: insertError } = await supabase
      .from('subscription_projection_entries')
      .upsert(projectionData, {
        onConflict: 'subscription_id,month',
        ignoreDuplicates: false,
      })
      .select();

    if (insertError) throw insertError;

    // Create OUTPUT entries for each projection entry (only if they don't exist)
    if (insertedProjections && insertedProjections.length > 0) {
      for (const proj of insertedProjections) {
        // Check if entry already exists
        const { data: existingEntry } = await supabase
          .from('entries')
          .select('id')
          .eq('reference_id', parseInt(id))
          .eq('schedule_entry_id', proj.id)
          .eq('entry_type', 'subscription_payment')
          .maybeSingle();

        if (!existingEntry) {
          const { error: entryError } = await supabase
            .from('entries')
            .insert({
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
            });

          if (entryError) {
            console.error('Error creating entry for subscription projection:', entryError);
            // Continue with other entries even if one fails
          }
        }
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

