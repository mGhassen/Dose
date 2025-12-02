// Expenses API Route
// Handles CRUD operations for expenses

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Expense, CreateExpenseData, PaginatedResponse } from '@kit/types';
import { getPaginationParams, createPaginatedResponse } from '@kit/types';

// Helper functions for transformation
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

function transformToSnakeCase(data: CreateExpenseData): any {
  return {
    name: data.name,
    category: data.category,
    amount: data.amount,
    subscription_id: data.subscriptionId || null,
    description: data.description,
    vendor: data.vendor,
    expense_date: data.expenseDate,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const { page, limit, offset } = getPaginationParams(searchParams);

    const supabase = createServerSupabaseClient();
    
    // Build base query for counting
    let countQuery = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });

    // Build query for data
    let query = supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
      countQuery = countQuery.eq('category', category);
    }

    if (month) {
      // Filter expenses by expense_date in this month
      const startOfMonth = month + '-01';
      const endOfMonth = new Date(month + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0); // Last day of month
      const lastDayOfMonth = endOfMonth.toISOString().split('T')[0];

      query = query
        .gte('expense_date', startOfMonth)
        .lte('expense_date', lastDayOfMonth);
      countQuery = countQuery
        .gte('expense_date', startOfMonth)
        .lte('expense_date', lastDayOfMonth);
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

    const expenses: Expense[] = (data || []).map(transformExpense);
    const total = count || 0;
    
    const response: PaginatedResponse<Expense> = createPaginatedResponse(
      expenses,
      total,
      page,
      limit
    );
    
    return NextResponse.json(response);
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
    if (!body.name || !body.category || !body.amount || !body.expenseDate) {
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

    // Create an OUTPUT entry for the expense
    const { error: entryError } = await supabase
      .from('entries')
      .insert({
        direction: 'output',
        entry_type: 'expense',
        name: body.name,
        amount: body.amount,
        description: body.description,
        category: body.category,
        vendor: body.vendor,
        entry_date: body.expenseDate,
        reference_id: data.id,
        is_active: true,
      });

    if (entryError) {
      console.error('Error creating entry for expense:', entryError);
      // Don't fail the expense creation if entry creation fails, but log it
    }

    return NextResponse.json(transformExpense(data), { status: 201 });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Failed to create expense', details: error.message },
      { status: 500 }
    );
  }
}

