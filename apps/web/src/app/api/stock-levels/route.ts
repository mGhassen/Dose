// Stock Levels API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { StockLevel, CreateStockLevelData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

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

function transformToSnakeCase(data: CreateStockLevelData): any {
  return {
    ingredient_id: data.ingredientId,
    quantity: data.quantity,
    unit: data.unit,
    location: data.location,
    minimum_stock_level: data.minimumStockLevel,
    maximum_stock_level: data.maximumStockLevel,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);
    const ingredientId = searchParams.get('ingredientId');
    const location = searchParams.get('location');

    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('stock_levels')
      .select('*')
      .order('last_updated', { ascending: false });

    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }
    if (location) {
      query = query.eq('location', location);
    }

    const countQuery = query.select('*', { count: 'exact', head: true });
    const dataQuery = query.range(offset, offset + limit - 1);

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const stockLevels: StockLevel[] = (data || []).map(transformStockLevel);
    const total = count || 0;
    
    return NextResponse.json(createPaginatedResponse(stockLevels, total, page, limit));
  } catch (error: any) {
    console.error('Error fetching stock levels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock levels', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateStockLevelData = await request.json();
    
    if (!body.ingredientId || body.quantity === undefined || !body.unit) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('stock_levels')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformStockLevel(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating stock level:', error);
    return NextResponse.json(
      { error: 'Failed to create stock level', details: error.message },
      { status: 500 }
    );
  }
}

