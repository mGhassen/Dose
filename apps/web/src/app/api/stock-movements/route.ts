// Stock Movements API Route

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import type { StockMovement, CreateStockMovementData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateStockMovementData): any {
  const result: any = {
    item_id: data.itemId,
    movement_type: data.movementType,
    quantity: data.quantity,
    unit: data.unit,
    reference_type: data.referenceType,
    reference_id: data.referenceId,
    location: data.location,
    notes: data.notes,
    movement_date: data.movementDate || new Date().toISOString(),
  };
  if (data.unitId != null) result.unit_id = data.unitId;
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const itemId = searchParams.get('itemId') || searchParams.get('ingredientId'); // Support both for backward compat
    const movementType = searchParams.get('movementType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = supabaseServer();
    
    let query = supabase
      .from('stock_movements')
      .select('*, item:items(*)')
      .order('movement_date', { ascending: false });

    if (itemId) {
      query = query.eq('item_id', itemId);
    }
    if (movementType) {
      query = query.eq('movement_type', movementType);
    }
    if (startDate) {
      query = query.gte('movement_date', startDate);
    }
    if (endDate) {
      query = query.lte('movement_date', `${endDate}T23:59:59.999Z`);
    }

    const countQuery = (query as any).select('*', { count: 'exact', head: true });
    const dataQuery = query.range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const movements: StockMovement[] = (data || []).map(transformStockMovement);
    const total = count || 0;
    
    return NextResponse.json(createPaginatedResponse(movements, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movements', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await import('@/shared/zod-schemas').then((m) =>
      m.parseRequestBody(request, m.createStockMovementSchema)
    );
    if (!parsed.success) return parsed.response;
    const body = parsed.data as CreateStockMovementData;

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('stock_movements')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    // Stock level will be automatically updated by trigger

    return NextResponse.json(transformStockMovement(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to create stock movement', details: error.message },
      { status: 500 }
    );
  }
}

