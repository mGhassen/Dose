// Payment by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Payment, UpdatePaymentData } from '../route';

function transformPayment(row: any): Payment {
  return {
    id: row.id,
    entryId: row.entry_id,
    paymentDate: row.payment_date,
    amount: parseFloat(row.amount),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdatePaymentData): any {
  const result: any = {};
  if ('entryId' in data) result.entry_id = data.entryId;
  if ('paymentDate' in data) result.payment_date = data.paymentDate;
  if ('amount' in data) result.amount = data.amount;
  if ('isPaid' in data) result.is_paid = data.isPaid !== undefined ? data.isPaid : false;
  if ('paidDate' in data) result.paid_date = data.paidDate || null;
  if ('paymentMethod' in data) result.payment_method = data.paymentMethod || null;
  if ('notes' in data) result.notes = data.notes || null;
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
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformPayment(data));
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment', details: error.message },
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
    const body: UpdatePaymentData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('payments')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformPayment(data));
  } catch (error: any) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment', details: error.message },
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
      .from('payments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment', details: error.message },
      { status: 500 }
    );
  }
}

