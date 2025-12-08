// Subscription API Route (by ID)
// Handles GET, PUT, DELETE operations for a specific subscription

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Subscription, UpdateSubscriptionData } from '@kit/types';

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
    vendor: row.vendor, // Keep for backward compatibility
    supplierId: row.supplier_id || undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateSubscriptionData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.category !== undefined) result.category = data.category;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.recurrence !== undefined) result.recurrence = data.recurrence;
  if (data.startDate !== undefined) result.start_date = data.startDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  if (data.description !== undefined) result.description = data.description;
  if (data.vendor !== undefined) result.vendor = data.vendor; // Keep for backward compatibility
  if (data.supplierId !== undefined) result.supplier_id = data.supplierId || null;
  if (data.isActive !== undefined) result.is_active = data.isActive;

  result.updated_at = new Date().toISOString();
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformSubscription(data));
  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateSubscriptionData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformSubscription(data));
  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription', details: error.message },
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
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to delete subscription', details: error.message },
      { status: 500 }
    );
  }
}

