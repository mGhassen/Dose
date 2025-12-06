// Items API Route (replaces ingredients)

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, CreateItemData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformItem(row: any): Item {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    category: row.category,
    itemType: row.item_type || 'item',
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Recipe-specific fields
    servingSize: row.serving_size,
    preparationTime: row.preparation_time,
    cookingTime: row.cooking_time,
    instructions: row.instructions,
    notes: row.notes,
  };
}

function transformToSnakeCase(data: CreateItemData): any {
  const result: any = {
    name: data.name,
    description: data.description,
    unit: data.unit,
    category: data.category,
    item_type: data.itemType || 'item',
    is_active: data.isActive ?? true,
  };
  
  // Recipe-specific fields
  if (data.itemType === 'recipe') {
    result.serving_size = data.servingSize;
    result.preparation_time = data.preparationTime;
    result.cooking_time = data.cookingTime;
    result.instructions = data.instructions;
    result.notes = data.notes;
  }
  
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const itemType = searchParams.get('itemType'); // Filter by item type

    const supabase = createServerSupabaseClient();
    
    // Count query
    let countQuery = supabase
      .from('items')
      .select('*', { count: 'exact', head: true });
    
    if (itemType) {
      countQuery = countQuery.eq('item_type', itemType);
    }

    // Data query
    let query = supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (itemType) {
      query = query.eq('item_type', itemType);
    }

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
    
    if (!body.name || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields: name and unit' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (itemError) throw itemError;

    return NextResponse.json(transformItem(itemData), { status: 201 });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error.message },
      { status: 500 }
    );
  }
}
