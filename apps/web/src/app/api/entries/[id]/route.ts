// Entry by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Entry, UpdateEntryData } from '../route';

function transformEntry(row: any, payments?: any[]): Entry {
  return {
    id: row.id,
    direction: row.direction,
    entryType: row.entry_type,
    name: row.name,
    amount: parseFloat(row.amount),
    description: row.description,
    category: row.category,
    vendor: row.vendor,
    entryDate: row.entry_date,
    dueDate: row.due_date,
    isRecurring: row.is_recurring || false,
    recurrenceType: row.recurrence_type,
    referenceId: row.reference_id,
    isActive: row.is_active !== undefined ? row.is_active : true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payments: payments?.map((p: any) => ({
      id: p.id,
      entryId: p.entry_id,
      paymentDate: p.payment_date,
      amount: parseFloat(p.amount),
      isPaid: p.is_paid,
      paidDate: p.paid_date,
      paymentMethod: p.payment_method,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })),
  };
}

function transformToSnakeCase(data: UpdateEntryData): any {
  const result: any = {};
  if ('direction' in data) result.direction = data.direction;
  if ('entryType' in data) result.entry_type = data.entryType;
  if ('name' in data) result.name = data.name;
  if ('amount' in data) result.amount = data.amount;
  if ('description' in data) result.description = data.description || null;
  if ('category' in data) result.category = data.category || null;
  if ('vendor' in data) result.vendor = data.vendor || null;
  if ('entryDate' in data) result.entry_date = data.entryDate;
  if ('dueDate' in data) result.due_date = data.dueDate || null;
  if ('isRecurring' in data) result.is_recurring = data.isRecurring || false;
  if ('recurrenceType' in data) result.recurrence_type = data.recurrenceType || null;
  if ('referenceId' in data) result.reference_id = data.referenceId || null;
  if ('isActive' in data) result.is_active = data.isActive !== undefined ? data.isActive : true;
  return result;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includePayments = searchParams.get('includePayments') !== 'false';

    const supabase = createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Fetch payments if requested
    let payments: any[] = [];
    if (includePayments) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .eq('entry_id', id)
        .order('payment_date', { ascending: false });

      if (!paymentsError && paymentsData) {
        payments = paymentsData;
      }
    }

    return NextResponse.json(transformEntry(data, payments));
  } catch (error: any) {
    console.error('Error fetching entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entry', details: error.message },
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
    const body: UpdateEntryData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('entries')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(transformEntry(data));
  } catch (error: any) {
    console.error('Error updating entry:', error);
    return NextResponse.json(
      { error: 'Failed to update entry', details: error.message },
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
      .from('entries')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete entry', details: error.message },
      { status: 500 }
    );
  }
}

