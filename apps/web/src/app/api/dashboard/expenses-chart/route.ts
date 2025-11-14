// Dashboard Expenses Chart API Route

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

function transformExpense(row: any) {
  return {
    amount: parseFloat(row.amount),
    recurrence: row.recurrence,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('expenses')
      .select('amount, recurrence, start_date, end_date, is_active')
      .eq('is_active', true);

    if (error) throw error;

    const expenses = (data || []).map(transformExpense);

    // Project expenses for the year
    const { projectExpensesForYear } = await import('@/lib/calculations/expense-projections');
    const expenseProjections = projectExpensesForYear(expenses, year);

    // Group by month
    const monthlyData: Record<string, number> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = 0;
    });

    expenseProjections.forEach(proj => {
      const month = proj.month.slice(5, 7); // Extract MM from YYYY-MM
      monthlyData[month] = (monthlyData[month] || 0) + proj.amount;
    });

    // Format for chart
    const chartData = months.map(month => ({
      month: `${year}-${month}`,
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

