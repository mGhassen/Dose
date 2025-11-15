// Subscriptions API Route
// Handles CRUD operations for subscriptions

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Subscription, CreateSubscriptionData } from '@kit/types';

// Helper functions for transformation
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

function transformToSnakeCase(data: CreateSubscriptionData): any {
  return {
    name: data.name,
    category: data.category,
    amount: data.amount,
    recurrence: data.recurrence,
    start_date: data.startDate,
    end_date: data.endDate,
    description: data.description,
    vendor: data.vendor,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    const subscriptions: Subscription[] = (data || []).map(transformSubscription);
    
    return NextResponse.json(subscriptions);
  } catch (error: any) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSubscriptionData = await request.json();
    
    // Basic validation
    if (!body.name || !body.category || !body.amount || !body.recurrence || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformSubscription(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error.message },
      { status: 500 }
    );
  }
}

