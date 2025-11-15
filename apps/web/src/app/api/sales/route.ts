// Sales API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Sale, CreateSaleData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateSaleData): any {
  return {
    date: data.date,
    type: data.type,
    amount: data.amount,
    quantity: data.quantity,
    description: data.description,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const type = searchParams.get('type');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build count query
    let countQuery = supabase
      .from('sales')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let query = supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (month) {
      const startOfMonth = `${month}-01`;
      const endOfMonth = new Date(`${month}-01`);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      query = query
        .gte('date', startOfMonth)
        .lte('date', endDate);
      countQuery = countQuery
        .gte('date', startOfMonth)
        .lte('date', endDate);
    }

    if (type) {
      query = query.eq('type', type);
      countQuery = countQuery.eq('type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const sales: Sale[] = (data || []).map(transformSale);
    const total = count || 0;
    
    const response: PaginatedResponse<Sale> = createPaginatedResponse(
      sales,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSaleData = await request.json();
    
    if (!body.date || !body.type || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields: date, type, amount' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sales')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformSale(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { error: 'Failed to create sale', details: error.message },
      { status: 500 }
    );
  }
}

