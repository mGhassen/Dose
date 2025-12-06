// Items API Route - Get, Update, Delete by ID

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, UpdateItemData } from '@kit/types';

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

function transformToSnakeCase(data: UpdateItemData): any {
  const result: any = {};
  
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.category !== undefined) result.category = data.category;
  if (data.itemType !== undefined) result.item_type = data.itemType;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  
  // Recipe-specific fields
  if (data.itemType === 'recipe' || data.servingSize !== undefined) {
    if (data.servingSize !== undefined) result.serving_size = data.servingSize;
    if (data.preparationTime !== undefined) result.preparation_time = data.preparationTime;
    if (data.cookingTime !== undefined) result.cooking_time = data.cookingTime;
    if (data.instructions !== undefined) result.instructions = data.instructions;
    if (data.notes !== undefined) result.notes = data.notes;
  }
  
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerSupabaseClient();
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (itemError) throw itemError;
    if (!itemData) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformItem(itemData));
  } catch (error: any) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item', details: error.message },
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
    const body: UpdateItemData = await request.json();
    
    const supabase = createServerSupabaseClient();
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (itemError) throw itemError;

    return NextResponse.json(transformItem(itemData));
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item', details: error.message },
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
      .from('items')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item', details: error.message },
      { status: 500 }
    );
  }
}
