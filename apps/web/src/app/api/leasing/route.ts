// Leasing Payments API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { LeasingPayment, CreateLeasingPaymentData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

function transformLeasing(row: any): LeasingPayment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    description: row.description,
    lessor: row.lessor,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateLeasingPaymentData): any {
  return {
    name: data.name,
    type: data.type,
    amount: data.amount,
    start_date: data.startDate,
    end_date: data.endDate,
    frequency: data.frequency,
    description: data.description,
    lessor: data.lessor,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Count query
    const countQuery = supabase
      .from('leasing_payments')
      .select('*', { count: 'exact', head: true });

    // Data query
    const query = supabase
      .from('leasing_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Execute queries
    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) throw error;
    if (countError) throw countError;

    const leasing: LeasingPayment[] = (data || []).map(transformLeasing);
    const total = count || 0;
    
    const response: PaginatedResponse<LeasingPayment> = createPaginatedResponse(
      leasing,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching leasing payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leasing payments', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateLeasingPaymentData = await request.json();
    
    if (!body.name || !body.type || !body.amount || !body.frequency || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('leasing_payments')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformLeasing(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating leasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to create leasing payment', details: error.message },
      { status: 500 }
    );
  }
}

