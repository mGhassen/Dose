// Item by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Item, UpdateItemData } from '@kit/types';

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

function transformToSnakeCase(data: UpdateItemData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.description !== undefined) result.description = data.description;
  if (data.category !== undefined) result.category = data.category;
  if (data.sku !== undefined) result.sku = data.sku;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitPrice !== undefined) result.unit_price = data.unitPrice;
  if (data.vendorId !== undefined) result.vendor_id = data.vendorId;
  if (data.notes !== undefined) result.notes = data.notes;
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
      .from('items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformItem(data));
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
    const { data, error } = await supabase
      .from('items')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformItem(data));
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

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item', details: error.message },
      { status: 500 }
    );
  }
}

