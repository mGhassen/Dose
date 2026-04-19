// Dashboard KPIs API Route
// Returns financial KPIs for the dashboard

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getMonthsInRange } from '@kit/lib/date-periods';
import { timestamptzBoundsFromYmdRange } from '@kit/lib';

function transformSale(row: any) {
  const subtotal = row.subtotal != null ? parseFloat(row.subtotal) : null;
  const totalTax = row.total_tax != null ? parseFloat(row.total_tax) : 0;
  const totalDiscount = row.total_discount != null ? parseFloat(row.total_discount) : 0;
  const headerTotal =
    Math.round(((subtotal ?? 0) + totalTax - totalDiscount) * 100) / 100;
  return {
    date: row.date,
    amount: headerTotal,
    subtotal,
  };
}

function transformExpense(row: any) {
  return {
    amount: parseFloat(row.amount),
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
    const yearParam = searchParams.get('year');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const year = yearParam || new Date().getFullYear().toString();
    const startDate = startDateParam || `${year}-01-01`;
    const endDate = endDateParam || `${year}-12-31`;

    const monthsInRange = getMonthsInRange(startDate, endDate);
    const firstMonth = monthsInRange[0] || `${year}-01`;
    const lastMonth = monthsInRange[monthsInRange.length - 1] || `${year}-12`;

    const supabase = supabaseServer();
    const salesDateBounds = timestamptzBoundsFromYmdRange(startDate, endDate);

    let allSales: any[] = [];
    let salesPage = 0;
    const salesPageSize = 1000;
    let salesHasMore = true;
    while (salesHasMore) {
      const { data: salesPageData, error: salesErr } = await supabase
        .from('sales')
        .select('date, subtotal, total_tax, total_discount')
        .gte('date', salesDateBounds.gte)
        .lte('date', salesDateBounds.lte)
        .range(salesPage * salesPageSize, (salesPage + 1) * salesPageSize - 1);
      if (salesErr) throw salesErr;
      if (salesPageData?.length) {
        allSales = allSales.concat(salesPageData);
        salesHasMore = salesPageData.length === salesPageSize;
        salesPage++;
      } else {
        salesHasMore = false;
      }
    }

    const [expensesResult, personnelResult, loansResult, cashFlowResult, workingCapitalResult, profitLossResult] = await Promise.all([
      supabase.from('expenses').select('amount, start_date, end_date, is_active').eq('is_active', true),
      supabase.from('personnel').select('base_salary, employer_charges, employer_charges_type, start_date, end_date, is_active').eq('is_active', true),
      supabase.from('loans').select('principal_amount, status').eq('status', 'active'),
      supabase.from('cash_flow').select('month, closing_balance').eq('month', lastMonth),
      supabase.from('working_capital').select('month, working_capital_need').eq('month', lastMonth),
      supabase.from('profit_and_loss').select('total_revenue, cost_of_goods_sold, net_profit, taxes').gte('month', firstMonth).lte('month', lastMonth),
    ]);

    if (expensesResult.error) throw expensesResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (loansResult.error) throw loansResult.error;
    if (cashFlowResult.error) throw cashFlowResult.error;
    if (workingCapitalResult.error && workingCapitalResult.error.code !== 'PGRST116') throw workingCapitalResult.error;
    if (profitLossResult.error) throw profitLossResult.error;

    const sales = allSales.map(transformSale);
    const expenses = (expensesResult.data || []).map(transformExpense);
    const personnel = (personnelResult.data || []).map(transformPersonnel);
    const loans = (loansResult.data || []).map(transformLoan);
    const cashFlow = cashFlowResult.data?.[0] ? transformCashFlow(cashFlowResult.data[0]) : null;
    const workingCapital = workingCapitalResult.data?.[0] ? transformWorkingCapital(workingCapitalResult.data[0]) : null;
    const profitLoss = profitLossResult.data || [];

    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.subtotal != null ? sale.subtotal : sale.amount), 0);

    const { projectExpensesForDateRange } = await import('@/lib/calculations/expense-projections');
    const expenseProjections = projectExpensesForDateRange(expenses as any, startDate, endDate);
    const totalExpenses = expenseProjections.reduce((sum, proj) => sum + proj.amount, 0);

    const netProfit = profitLoss.reduce((sum, pl) => sum + parseFloat(pl.net_profit || '0'), 0) || (totalRevenue - totalExpenses);

    const cashBalance = cashFlow?.closingBalance || 0;
    const workingCapitalValue = workingCapital?.workingCapitalNeed || 0;
    const totalDebt = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);

    const monthlyPersonnelCost = personnel.reduce((sum, person) => {
      const charges = person.employerChargesType === 'percentage'
        ? person.baseSalary * (person.employerCharges / 100)
        : person.employerCharges;
      return sum + person.baseSalary + charges;
    }, 0);
    const personnelCost = monthlyPersonnelCost * monthsInRange.length;

    const costOfGoodsSold = profitLoss.reduce((sum, pl) => sum + parseFloat(pl.cost_of_goods_sold || '0'), 0);
    const grossProfit = totalRevenue - costOfGoodsSold;
    const totalTaxes = profitLoss.reduce((sum, pl) => sum + parseFloat(pl.taxes || '0'), 0);

    return NextResponse.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      cashBalance,
      workingCapital: workingCapitalValue,
      totalDebt,
      personnelCost,
      grossProfit,
      totalTaxes,
    });
  } catch (error: any) {
    console.error('Error fetching dashboard KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard KPIs', details: error.message },
      { status: 500 }
    );
  }
}

