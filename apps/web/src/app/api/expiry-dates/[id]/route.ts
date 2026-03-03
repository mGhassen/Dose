// Expiry Date by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ExpiryDate, UpdateExpiryDateData } from '@kit/types';

function transformExpiryDate(row: any): ExpiryDate {
  return {
    id: row.id,
    itemId: row.item_id,
    stockMovementId: row.stock_movement_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    unitId: row.unit_id,
    expiryDate: row.expiry_date,
    location: row.location,
    isExpired: row.is_expired,
    disposedDate: row.disposed_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateExpiryDateData): any {
  const result: any = {};
  if (data.itemId !== undefined) result.item_id = data.itemId;
  if (data.stockMovementId !== undefined) result.stock_movement_id = data.stockMovementId;
  if (data.quantity !== undefined) result.quantity = data.quantity;
  if (data.unit !== undefined) result.unit = data.unit;
  if (data.unitId !== undefined) result.unit_id = data.unitId;
  if (data.expiryDate !== undefined) result.expiry_date = data.expiryDate;
  if (data.location !== undefined) result.location = data.location;
  if (data.disposedDate !== undefined) result.disposed_date = data.disposedDate;
  if (data.notes !== undefined) result.notes = data.notes;
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
      .from('expiry_dates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Expiry date not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformExpiryDate(data));
  } catch (error: any) {
    console.error('Error fetching expiry date:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiry date', details: error.message },
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
    const body: UpdateExpiryDateData = await request.json();
    
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expiry_dates')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Expiry date not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformExpiryDate(data));
  } catch (error: any) {
    console.error('Error updating expiry date:', error);
    return NextResponse.json(
      { error: 'Failed to update expiry date', details: error.message },
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
      .from('expiry_dates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting expiry date:', error);
    return NextResponse.json(
      { error: 'Failed to delete expiry date', details: error.message },
      { status: 500 }
    );
  }
}

