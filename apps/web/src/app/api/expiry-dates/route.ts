// Expiry Dates API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ExpiryDate, CreateExpiryDateData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformExpiryDate(row: any): ExpiryDate {
  return {
    id: row.id,
    ingredientId: row.ingredient_id,
    stockMovementId: row.stock_movement_id,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    expiryDate: row.expiry_date,
    location: row.location,
    isExpired: row.is_expired,
    disposedDate: row.disposed_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateExpiryDateData): any {
  return {
    ingredient_id: data.ingredientId,
    stock_movement_id: data.stockMovementId,
    quantity: data.quantity,
    unit: data.unit,
    expiry_date: data.expiryDate,
    location: data.location,
    notes: data.notes,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const ingredientId = searchParams.get('ingredientId');
    const isExpired = searchParams.get('isExpired');

    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('expiry_dates')
      .select('*')
      .order('expiry_date', { ascending: true });

    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }
    if (isExpired !== null) {
      query = query.eq('is_expired', isExpired === 'true');
    }

    const countQuery = query.select('*', { count: 'exact', head: true });
    const dataQuery = query.range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const expiryDates: ExpiryDate[] = (data || []).map(transformExpiryDate);
    const total = count || 0;
    
    return NextResponse.json(createPaginatedResponse(expiryDates, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching expiry dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiry dates', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateExpiryDateData = await request.json();
    
    if (!body.ingredientId || body.quantity === undefined || !body.unit || !body.expiryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expiry_dates')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformExpiryDate(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating expiry date:', error);
    return NextResponse.json(
      { error: 'Failed to create expiry date', details: error.message },
      { status: 500 }
    );
  }
}

