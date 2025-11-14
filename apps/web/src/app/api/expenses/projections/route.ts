// Expense Projections API Route
// Calculates expense projections for annual budgeting

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { projectExpensesForYear, calculateAnnualBudgetSummary } from '@/lib/calculations/expense-projections';
import type { Expense, ExpenseProjection, ExpenseProjectionSummary } from '@kit/types';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const startMonth = searchParams.get('start');
    const endMonth = searchParams.get('end');

    if (!year && (!startMonth || !endMonth)) {
      return NextResponse.json(
        { error: 'Either year or start/end months must be provided' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Fetch all active expenses
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const expenses: Expense[] = (data || []).map(transformExpense);

    let projections: ExpenseProjection[];
    
    if (year) {
      // Project for entire year
      const { projectExpensesForYear } = await import('@/lib/calculations/expense-projections');
      projections = projectExpensesForYear(expenses, year);
    } else if (startMonth && endMonth) {
      // Project for date range
      const { projectExpense } = await import('@/lib/calculations/expense-projections');
      projections = [];
      for (const expense of expenses) {
        const expenseProjections = projectExpense(expense, startMonth, endMonth);
        projections.push(...expenseProjections);
      }
      projections.sort((a, b) => a.month.localeCompare(b.month));
    } else {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json(projections);
  } catch (error: any) {
    console.error('Error calculating expense projections:', error);
    return NextResponse.json(
      { error: 'Failed to calculate expense projections', details: error.message },
      { status: 500 }
    );
  }
}

