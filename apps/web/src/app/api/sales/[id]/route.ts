// Sale by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, UpdateSaleData } from '@kit/types';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    description: row.description,
    itemId: row.item_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: row.item ? {
      id: row.item.id,
      name: row.item.name,
      description: row.item.description,
      category: row.item.category,
      sku: row.item.sku,
      unit: row.item.unit,
      unitPrice: row.item.unit_price ? parseFloat(row.item.unit_price) : undefined,
      itemType: row.item.item_type,
      isActive: row.item.is_active,
    } : undefined,
  };
}

function transformToSnakeCase(data: UpdateSaleData): any {
  const result: any = {};
  if (data.date !== undefined) result.date = data.date;
  if (data.type !== undefined) result.type = data.type;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.description !== undefined) result.description = data.description;
  if (data.itemId !== undefined) result.item_id = data.itemId;
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
      .from('sales')
      .select('*, item:items(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformSale(data));
  } catch (error: any) {
    console.error('Error fetching sale:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sale', details: error.message },
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
    const body: UpdateSaleData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformSale(data));
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return NextResponse.json(
      { error: 'Failed to update sale', details: error.message },
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
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return NextResponse.json(
      { error: 'Failed to delete sale', details: error.message },
      { status: 500 }
    );
  }
}

