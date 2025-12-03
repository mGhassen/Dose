// Leasing Payment by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { LeasingPayment, UpdateLeasingPaymentData } from '@kit/types';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateLeasingPaymentData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.type = data.type;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.startDate !== undefined) result.start_date = data.startDate;
  if (data.endDate !== undefined) result.end_date = data.endDate;
  if (data.frequency !== undefined) result.frequency = data.frequency;
  if (data.description !== undefined) result.description = data.description;
  if (data.lessor !== undefined) result.lessor = data.lessor;
  if (data.isActive !== undefined) result.is_active = data.isActive;
  if (data.offPaymentMonths !== undefined) {
    result.off_payment_months = Array.isArray(data.offPaymentMonths) && data.offPaymentMonths.length > 0
      ? data.offPaymentMonths
      : [];
  }
  if (data.firstPaymentAmount !== undefined) {
    result.first_payment_amount = data.firstPaymentAmount !== null ? data.firstPaymentAmount : null;
  }
  result.updated_at = new Date().toISOString();
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
      .from('leasing_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leasing payment not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformLeasing(data));
  } catch (error: any) {
    console.error('Error fetching leasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leasing payment', details: error.message },
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
    const body: UpdateLeasingPaymentData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('leasing_payments')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Leasing payment not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformLeasing(data));
  } catch (error: any) {
    console.error('Error updating leasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to update leasing payment', details: error.message },
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
      .from('leasing_payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting leasing payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete leasing payment', details: error.message },
      { status: 500 }
    );
  }
}

