// Stock Level by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { StockLevel, UpdateStockLevelData } from '@kit/types';

function transformStockLevel(row: any): StockLevel {
  return {
    id: row.id,
    itemId: row.item_id || row.ingredient_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    unitId: row.unit_id,
    location: row.location,
    minimumStockLevel: row.minimum_stock_level ? parseFloat(row.minimum_stock_level) : undefined,
    maximumStockLevel: row.maximum_stock_level ? parseFloat(row.maximum_stock_level) : undefined,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    item: row.item ? {
      id: row.item.id,
      name: row.item.name,
      description: row.item.description,
      unit: row.item.units?.symbol || '',
      category: row.item.category,
      itemType: row.item.item_type || 'item',
      isActive: row.item.is_active,
      createdAt: row.item.created_at,
      updatedAt: row.item.updated_at,
    } : undefined,
  };
}

function transformToSnakeCase(data: UpdateStockLevelData): any {
  const result: any = {};
  if (data.itemId !== undefined) result.item_id = data.itemId;
  if ((data as { ingredientId?: number }).ingredientId !== undefined) result.item_id = (data as { ingredientId: number }).ingredientId; // Backward compat
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.location !== undefined) result.location = data.location;
  if (data.minimumStockLevel !== undefined) result.minimum_stock_level = data.minimumStockLevel;
  if (data.maximumStockLevel !== undefined) result.maximum_stock_level = data.maximumStockLevel;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = supabaseServer();
    
    const { data, error } = await supabase
      .from('stock_levels')
      .select('*, item:items(*, units(symbol, name))')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Stock level not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformStockLevel(data));
  } catch (error: any) {
    console.error('Error fetching stock level:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock level', details: error.message },
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
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.updateStockLevelSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateStockLevelData;

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('stock_levels')
      .update({
        ...transformToSnakeCase(body),
        last_updated: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Stock level not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformStockLevel(data));
  } catch (error: any) {
    console.error('Error updating stock level:', error);
    return NextResponse.json(
      { error: 'Failed to update stock level', details: error.message },
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
    const supabase = supabaseServer();
    
    const { error } = await supabase
      .from('stock_levels')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting stock level:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock level', details: error.message },
      { status: 500 }
    );
  }
}

