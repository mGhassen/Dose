// Stock Movement by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { StockMovement, UpdateStockMovementData } from '@kit/types';

function transformStockMovement(row: any): StockMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    movementType: row.movement_type,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    unitId: row.unit_id,
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
  if (data.itemId !== undefined) result.item_id = data.itemId;
  if (data.movementType !== undefined) result.movement_type = data.movementType;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
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
    const supabase = supabaseServer();
    
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
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.updateStockMovementSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as UpdateStockMovementData;
    
    const supabase = supabaseServer();
    const { data: existing, error: existingError } = await supabase
      .from("stock_movements")
      .select("id, item_id, movement_type, quantity, unit, unit_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: "Stock movement not found" }, { status: 404 });
    }

    const stockAffectingChange =
      (body.itemId !== undefined && body.itemId !== existing.item_id) ||
      (body.movementType !== undefined && body.movementType !== existing.movement_type) ||
      (body.quantity !== undefined && Number(body.quantity) !== Number(existing.quantity)) ||
      (body.unit !== undefined && body.unit !== existing.unit) ||
      (body.unitId !== undefined && body.unitId !== existing.unit_id);

    if (stockAffectingChange) {
      return NextResponse.json(
        {
          error:
            "Editing movement quantity/type/item/unit is not supported yet because it can desync stock levels. Delete and recreate the movement instead.",
        },
        { status: 400 }
      );
    }

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
    const supabase = supabaseServer();
    
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

