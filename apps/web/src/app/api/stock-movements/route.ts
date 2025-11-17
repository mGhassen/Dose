// Stock Movements API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { StockMovement, CreateStockMovementData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateStockMovementData): any {
  return {
    ingredient_id: data.ingredientId,
    movement_type: data.movementType,
    quantity: data.quantity,
    unit: data.unit,
    reference_type: data.referenceType,
    reference_id: data.referenceId,
    location: data.location,
    notes: data.notes,
    movement_date: data.movementDate || new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const ingredientId = searchParams.get('ingredientId');
    const movementType = searchParams.get('movementType');

    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('movement_date', { ascending: false });

    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }
    if (movementType) {
      query = query.eq('movement_type', movementType);
    }

    const countQuery = query.select('*', { count: 'exact', head: true });
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
    const body: CreateStockMovementData = await request.json();
    
    if (!body.ingredientId || !body.movementType || body.quantity === undefined || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
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

