// Expense by ID API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Expense, UpdateExpenseData } from '@kit/types';

function transformExpense(row: any): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    subscriptionId: row.subscription_id || undefined,
    description: row.description,
    vendor: row.vendor,
    expenseDate: row.expense_date || row.start_date, // Fallback to start_date for migration
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: UpdateExpenseData): any {
  const result: any = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.category !== undefined) result.category = data.category;
  if (data.amount !== undefined) result.amount = data.amount;
  if (data.subscriptionId !== undefined) result.subscription_id = data.subscriptionId || null;
  if (data.expenseDate !== undefined) result.expense_date = data.expenseDate;
  if (data.description !== undefined) result.description = data.description;
  if (data.vendor !== undefined) result.vendor = data.vendor;
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
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformExpense(data));
  } catch (error: any) {
    console.error('Error fetching expense:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expense', details: error.message },
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
    const body: UpdateExpenseData = await request.json();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expenses')
      .update(transformToSnakeCase(body))
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(transformExpense(data));
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json(
      { error: 'Failed to update expense', details: error.message },
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
      .from('expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json(
      { error: 'Failed to delete expense', details: error.message },
      { status: 500 }
    );
  }
}

