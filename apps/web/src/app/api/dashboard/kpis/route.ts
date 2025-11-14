// Dashboard KPIs API Route
// Returns financial KPIs for the dashboard

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';

function transformSale(row: any) {
  return {
    date: row.date,
    amount: parseFloat(row.amount),
  };
}

function transformExpense(row: any) {
  return {
    amount: parseFloat(row.amount),
    recurrence: row.recurrence,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

function transformPersonnel(row: any) {
  return {
    baseSalary: parseFloat(row.base_salary),
    employerCharges: parseFloat(row.employer_charges),
    employerChargesType: row.employer_charges_type,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

function transformLoan(row: any) {
  return {
    principalAmount: parseFloat(row.principal_amount),
    status: row.status,
  };
}

function transformCashFlow(row: any) {
  return {
    month: row.month,
    closingBalance: parseFloat(row.closing_balance),
  };
}

function transformWorkingCapital(row: any) {
  return {
    month: row.month,
    workingCapitalNeed: parseFloat(row.working_capital_need),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const supabase = createServerSupabaseClient();

    // Fetch all data for the year
    const [salesResult, expensesResult, personnelResult, loansResult, cashFlowResult, workingCapitalResult, profitLossResult] = await Promise.all([
      supabase.from('sales').select('date, amount').gte('date', startDate).lte('date', endDate),
      supabase.from('expenses').select('amount, recurrence, start_date, end_date, is_active').eq('is_active', true),
      supabase.from('personnel').select('base_salary, employer_charges, employer_charges_type, start_date, end_date, is_active').eq('is_active', true),
      supabase.from('loans').select('principal_amount, status').eq('status', 'active'),
      supabase.from('cash_flow').select('month, closing_balance').eq('month', `${year}-12`),
      supabase.from('working_capital').select('month, working_capital_need').eq('month', `${year}-12`),
      supabase.from('profit_and_loss').select('total_revenue, cost_of_goods_sold, net_profit').gte('month', `${year}-01`).lte('month', `${year}-12`),
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (loansResult.error) throw loansResult.error;
    if (cashFlowResult.error) throw cashFlowResult.error;
    if (workingCapitalResult.error && workingCapitalResult.error.code !== 'PGRST116') throw workingCapitalResult.error;
    if (profitLossResult.error) throw profitLossResult.error;

    const sales = (salesResult.data || []).map(transformSale);
    const expenses = (expensesResult.data || []).map(transformExpense);
    const personnel = (personnelResult.data || []).map(transformPersonnel);
    const loans = (loansResult.data || []).map(transformLoan);
    const cashFlow = cashFlowResult.data?.[0] ? transformCashFlow(cashFlowResult.data[0]) : null;
    const workingCapital = workingCapitalResult.data?.[0] ? transformWorkingCapital(workingCapitalResult.data[0]) : null;
    const profitLoss = profitLossResult.data || [];

    // Calculate Total Revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);

    // Calculate Total Expenses (project expenses for the year)
    const { projectExpensesForYear } = await import('@/lib/calculations/expense-projections');
    const expenseProjections = projectExpensesForYear(expenses, year);
    const totalExpenses = expenseProjections.reduce((sum, proj) => sum + proj.amount, 0);

    // Calculate Net Profit
    const netProfit = profitLoss.reduce((sum, pl) => sum + parseFloat(pl.net_profit || '0'), 0) || (totalRevenue - totalExpenses);

    // Calculate Cash Balance (from latest cash flow or 0)
    const cashBalance = cashFlow?.closingBalance || 0;

    // Calculate Working Capital
    const workingCapitalValue = workingCapital?.workingCapitalNeed || 0;

    // Calculate Total Debt (sum of active loans)
    const totalDebt = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);

    // Calculate Personnel Cost (monthly, then multiply by 12 for annual)
    const personnelCost = personnel.reduce((sum, person) => {
      const charges = person.employerChargesType === 'percentage'
        ? person.baseSalary * (person.employerCharges / 100)
        : person.employerCharges;
      return sum + person.baseSalary + charges;
    }, 0) * 12; // Annual cost

    // Calculate Gross Profit
    const costOfGoodsSold = profitLoss.reduce((sum, pl) => sum + parseFloat(pl.cost_of_goods_sold || '0'), 0);
    const grossProfit = totalRevenue - costOfGoodsSold;

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      cashBalance,
      workingCapital: workingCapitalValue,
      totalDebt,
      personnelCost,
      grossProfit,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard KPIs', details: error.message },
      { status: 500 }
    );
  }
}

