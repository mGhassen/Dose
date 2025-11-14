// Expenses API Route
// Handles CRUD operations for expenses

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Expense, CreateExpenseData } from '@kit/types';

// Helper functions for transformation
function transformExpense(row: any): Expense {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    recurrence: row.recurrence,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    vendor: row.vendor,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformToSnakeCase(data: CreateExpenseData): any {
  return {
    name: data.name,
    category: data.category,
    amount: data.amount,
    recurrence: data.recurrence,
    start_date: data.startDate,
    end_date: data.endDate,
    description: data.description,
    vendor: data.vendor,
    is_active: data.isActive ?? true,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = searchParams.get('month');

    const supabase = createServerSupabaseClient();
    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (month) {
      // Filter expenses that occur in this month based on recurrence
      // This is a simplified filter - full projection logic is in the projections endpoint
      const startOfMonth = new Date(month + '-01');
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0); // Last day of month

      query = query
        .lte('start_date', endOfMonth.toISOString().split('T')[0])
        .or(`end_date.is.null,end_date.gte.${startOfMonth.toISOString().split('T')[0]}`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const expenses: Expense[] = (data || []).map(transformExpense);
    
    return NextResponse.json(expenses);
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateExpenseData = await request.json();
    
    // Basic validation
    if (!body.name || !body.category || !body.amount || !body.recurrence || !body.startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('expenses')
      .insert(transformToSnakeCase(body))
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(transformExpense(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense', details: error.message },
      { status: 500 }
    );
  }
}

