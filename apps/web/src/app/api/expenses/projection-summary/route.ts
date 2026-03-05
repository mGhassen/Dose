// Expense Projection Summary API Route
// Returns annual summary with totals and averages

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { projectExpensesForYear, calculateAnnualBudgetSummary } from '@/lib/calculations/expense-projections';
import type { Expense, ExpenseProjectionSummary } from '@kit/types';

function transformExpense(row: any): Expense {
  const base = {
    id: row.id,
    name: row.name,
    category: row.category,
    amount: parseFloat(row.amount),
    expenseDate: row.expense_date ?? row.start_date,
    description: row.description,
    vendor: row.vendor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  return { ...base, startDate: row.start_date, endDate: row.end_date, isActive: row.is_active } as Expense;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');

    if (!year) {
      return NextResponse.json(
        { error: 'Year parameter is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    
    // Fetch all active expenses
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const expenses: Expense[] = (data || []).map(transformExpense);

    // Project expenses for the year
    const projections = projectExpensesForYear(expenses, year);

    // Calculate summary
    const summary = calculateAnnualBudgetSummary(projections, year);

    const result: ExpenseProjectionSummary = {
      year,
      totalAnnual: summary.totalAnnual,
      monthlyAverage: summary.monthlyAverage,
      byCategory: summary.byCategory,
      monthlyBreakdown: summary.monthlyBreakdown,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error calculating expense projection summary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate expense projection summary', details: error.message },
      { status: 500 }
    );
  }
}

