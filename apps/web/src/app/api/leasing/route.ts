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
    offPaymentMonths: row.off_payment_months || [],
    firstPaymentAmount: row.first_payment_amount ? parseFloat(row.first_payment_amount) : undefined,
    totalAmount: row.total_amount ? parseFloat(row.total_amount) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateLeasingPaymentData): any {
  const result: any = {
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
  
  // Only include off_payment_months if it's provided and not empty
  if (data.offPaymentMonths && Array.isArray(data.offPaymentMonths) && data.offPaymentMonths.length > 0) {
    result.off_payment_months = data.offPaymentMonths;
  } else {
    result.off_payment_months = [];
  }
  
  // Only include first_payment_amount if it's provided
  if (data.firstPaymentAmount !== undefined && data.firstPaymentAmount !== null) {
    result.first_payment_amount = data.firstPaymentAmount;
  }
  
  // Only include total_amount if it's provided
  if (data.totalAmount !== undefined && data.totalAmount !== null) {
    result.total_amount = data.totalAmount;
  }
  
  return result;
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
    
    if (!body.name || !body.type || !body.frequency || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Either amount or totalAmount must be provided
    if (!body.amount && !body.totalAmount) {
      return NextResponse.json(
        { error: 'Either amount or totalAmount must be provided' },
        { status: 400 }
      );
    }

    // If totalAmount is provided, endDate is required
    if (body.totalAmount && !body.endDate) {
      return NextResponse.json(
        { error: 'End date is required when using totalAmount' },
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

    // Create an OUTPUT entry for the leasing payment
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: 'leasing',
        name: body.name,
        amount: body.amount,
        description: body.description,
        entry_date: body.startDate,
        reference_id: data.id,
        is_active: body.isActive ?? true,
      });

    if (entryError) {
      console.error('Error creating entry for leasing payment:', entryError);
      // Don't fail the leasing creation if entry creation fails, but log it
    }

    return NextResponse.json(transformLeasing(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating leasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to create leasing payment', details: error.message },
      { status: 500 }
    );
  }
}

