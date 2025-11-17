// Stock Level by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { StockLevel, UpdateStockLevelData } from '@kit/types';

function transformStockLevel(row: any): StockLevel {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    location: row.location,
    minimumStockLevel: row.minimum_stock_level ? parseFloat(row.minimum_stock_level) : undefined,
    maximumStockLevel: row.maximum_stock_level ? parseFloat(row.maximum_stock_level) : undefined,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateStockLevelData): any {
  const result: any = {};
  if (data.ingredientId !== undefined) result.ingredient_id = data.ingredientId;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.unit !== undefined) result.unit = data.unit;
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
    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('stock_levels')
      .select('*')
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
    const body: UpdateStockLevelData = await request.json();
    
    const supabase = createServerSupabaseClient();
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
    const supabase = createServerSupabaseClient();
    
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

