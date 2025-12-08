// Subscriptions API Route
// Handles CRUD operations for subscriptions

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Subscription, CreateSubscriptionData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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
    vendor: row.vendor, // Keep for backward compatibility
    supplierId: row.supplier_id || undefined,
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
    vendor: data.vendor, // Keep for backward compatibility
    supplier_id: data.supplierId || null,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build count query
    let countQuery = supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
      countQuery = countQuery.eq('category', category);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
      countQuery = countQuery.eq('is_active', isActive === 'true');
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const subscriptions: Subscription[] = (data || []).map(transformSubscription);
    const total = count || 0;
    
    const response: PaginatedResponse<Subscription> = createPaginatedResponse(
      subscriptions,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
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

    // Create an OUTPUT entry for the subscription
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: 'subscription',
        name: body.name,
        amount: body.amount,
        description: body.description,
        category: body.category,
        vendor: body.vendor, // Keep for backward compatibility
        supplier_id: body.supplierId || null,
        entry_date: body.startDate,
        reference_id: data.id,
        is_active: body.isActive ?? true,
      });

    if (entryError) {
      console.error('Error creating entry for subscription:', entryError);
      // Don't fail the subscription creation if entry creation fails, but log it
    }

    return NextResponse.json(transformSubscription(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error.message },
      { status: 500 }
    );
  }
}

