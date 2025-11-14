// Expenses Analytics API Route
// Provides data for charts and visualizations

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { Expense } from '@kit/types';

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
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const supabase = createServerSupabaseClient();

    // Fetch all active expenses
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const expenses = (data || []).map(transformExpense);

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(exp => {
      categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
    });

    // Calculate recurrence breakdown
    const recurrenceBreakdown: Record<string, number> = {};
    expenses.forEach(exp => {
      // Calculate annual cost based on recurrence
      let annualCost = 0;
      switch (exp.recurrence) {
        case 'monthly':
          annualCost = exp.amount * 12;
          break;
        case 'quarterly':
          annualCost = exp.amount * 4;
          break;
        case 'yearly':
          annualCost = exp.amount;
          break;
        case 'one_time':
          annualCost = exp.amount;
          break;
        default:
          annualCost = exp.amount * 12; // Default to monthly
      }
      recurrenceBreakdown[exp.recurrence] = (recurrenceBreakdown[exp.recurrence] || 0) + annualCost;
    });

    // Project expenses for the year to get monthly breakdown
    const { projectExpensesForYear } = await import('@/lib/calculations/expense-projections');
    const expenseProjections = projectExpensesForYear(expenses, year);

    // Group by month
    const monthlyData: Record<string, { total: number; byCategory: Record<string, number> }> = {};
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    
    months.forEach(month => {
      monthlyData[month] = { total: 0, byCategory: {} };
    });

    expenseProjections.forEach(proj => {
      const month = proj.month.slice(5, 7);
      if (monthlyData[month]) {
        monthlyData[month].total += proj.amount;
        monthlyData[month].byCategory[proj.category] = 
          (monthlyData[month].byCategory[proj.category] || 0) + proj.amount;
      }
    });

    // Format monthly data for chart
    const monthlyChartData = months.map(month => ({
      month: `${year}-${month}`,
      total: monthlyData[month].total,
      ...monthlyData[month].byCategory,
    }));

    // Top expenses by annual cost
    const topExpenses = expenses
      .map(exp => {
        let annualCost = 0;
        switch (exp.recurrence) {
          case 'monthly':
            annualCost = exp.amount * 12;
            break;
          case 'quarterly':
            annualCost = exp.amount * 4;
            break;
          case 'yearly':
            annualCost = exp.amount;
            break;
          case 'one_time':
            annualCost = exp.amount;
            break;
          default:
            annualCost = exp.amount * 12;
        }
        return { ...exp, annualCost };
      })
      .sort((a, b) => b.annualCost - a.annualCost)
      .slice(0, 10);

    // Calculate totals
    const totalAnnual = Object.values(categoryBreakdown).reduce((sum, val) => {
      // Convert monthly to annual
      return sum + val * 12; // Approximate
    }, 0);

    return NextResponse.json({
      categoryBreakdown: Object.entries(categoryBreakdown).map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / Object.values(categoryBreakdown).reduce((a, b) => a + b, 0)) * 100,
      })),
      recurrenceBreakdown: Object.entries(recurrenceBreakdown).map(([recurrence, amount]) => ({
        recurrence,
        amount,
        percentage: (amount / Object.values(recurrenceBreakdown).reduce((a, b) => a + b, 0)) * 100,
      })),
      monthlyTrend: monthlyChartData,
      topExpenses: topExpenses.map(exp => ({
        id: exp.id,
        name: exp.name,
        category: exp.category,
        monthlyAmount: exp.amount,
        annualCost: exp.annualCost,
      })),
      summary: {
        totalExpenses: expenses.length,
        totalActiveExpenses: expenses.filter(e => e.isActive).length,
        totalMonthly: Object.values(monthlyData).reduce((sum, m) => sum + m.total, 0) / 12,
        totalAnnual,
      },
    });
  } catch (error: any) {
    console.error('Error fetching expenses analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expenses analytics', details: error.message },
      { status: 500 }
    );
  }
}

