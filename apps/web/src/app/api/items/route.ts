// Items API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, CreateItemData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformItem(row: any): Item {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    sku: row.sku,
    unit: row.unit,
    unitPrice: row.unit_price ? parseFloat(row.unit_price) : undefined,
    vendorId: row.vendor_id || undefined,
    notes: row.notes,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateItemData): any {
  return {
    name: data.name,
    description: data.description,
    category: data.category,
    sku: data.sku,
    unit: data.unit,
    unit_price: data.unitPrice,
    vendor_id: data.vendorId,
    notes: data.notes,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Count query
    const countQuery = supabase
      .from('items')
      .select('*', { count: 'exact', head: true });

    // Data query
    const query = supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const items: Item[] = (data || []).map(transformItem);
    const total = count || 0;
    
    const response: PaginatedResponse<Item> = createPaginatedResponse(
      items,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateItemData = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('items')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformItem(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    );
  }
}

