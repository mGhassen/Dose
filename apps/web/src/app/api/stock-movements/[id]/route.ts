// Stock Movement by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { StockMovement, UpdateStockMovementData } from '@kit/types';

function transformStockMovement(row: any): StockMovement {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    movementType: row.movement_type,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    location: row.location,
    notes: row.notes,
    movementDate: row.movement_date,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function transformToSnakeCase(data: UpdateStockMovementData): any {
  const result: any = {};
  if (data.ingredientId !== undefined) result.ingredient_id = data.ingredientId;
  if (data.movementType !== undefined) result.movement_type = data.movementType;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.referenceType !== undefined) result.reference_type = data.referenceType;
  if (data.referenceId !== undefined) result.reference_id = data.referenceId;
  if (data.location !== undefined) result.location = data.location;
  if (data.notes !== undefined) result.notes = data.notes;
  if (data.movementDate !== undefined) result.movement_date = data.movementDate;
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
      .from('stock_movements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Stock movement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformStockMovement(data));
  } catch (error: any) {
    console.error('Error fetching stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movement', details: error.message },
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
    const body: UpdateStockMovementData = await request.json();
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('stock_movements')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Stock movement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformStockMovement(data));
  } catch (error: any) {
    console.error('Error updating stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to update stock movement', details: error.message },
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
      .from('stock_movements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to delete stock movement', details: error.message },
      { status: 500 }
    );
  }
}

