// Dashboard Expenses Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { getMonthsInRange } from '@kit/lib/date-periods';

function transformExpense(row: any) {
  return {
    amount: parseFloat(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const startDate = searchParams.get('startDate') || `${year}-01-01`;
    const endDate = searchParams.get('endDate') || `${year}-12-31`;

    const monthsInRange = getMonthsInRange(startDate, endDate);
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('expenses')
      .select('amount, start_date, end_date, is_active')
      .eq('is_active', true);

    if (error) throw error;

    const expenses = (data || []).map(transformExpense);

    const { projectExpensesForDateRange } = await import('@/lib/calculations/expense-projections');
    const expenseProjections = projectExpensesForDateRange(expenses, startDate, endDate);

    const monthlyData: Record<string, number> = {};
    monthsInRange.forEach(m => { monthlyData[m] = 0; });

    expenseProjections.forEach(proj => {
      if (monthlyData[proj.month] !== undefined) {
        monthlyData[proj.month] += proj.amount;
      }
    });

    const chartData = monthsInRange.map(month => ({
      month,
      expenses: monthlyData[month] || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error('Error fetching expenses chart data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses chart data', details: error.message },
      { status: 500 }
    );
  }
}

