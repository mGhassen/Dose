// Calculate Balance Sheet API Route
// Auto-calculates balance sheet from other financial data

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { calculateBalanceSheet } from '@/lib/calculations/financial-statements';
import type { WorkingCapital, Investment, Loan, ProfitAndLoss } from '@kit/types';

function transformWorkingCapital(row: any): WorkingCapital {
  return {
    id: row.id,
    month: row.month,
    accountsReceivable: parseFloat(row.accounts_receivable),
    inventory: parseFloat(row.inventory),
    accountsPayable: parseFloat(row.accounts_payable),
    otherCurrentAssets: parseFloat(row.other_current_assets),
    otherCurrentLiabilities: parseFloat(row.other_current_liabilities),
    workingCapitalNeed: parseFloat(row.working_capital_need),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformInvestment(row: any): Investment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    purchaseDate: row.purchase_date,
    usefulLifeMonths: row.useful_life_months,
    depreciationMethod: row.depreciation_method,
    residualValue: parseFloat(row.residual_value),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLoan(row: any): Loan {
  return {
    id: row.id,
    name: row.name,
    loanNumber: row.loan_number,
    principalAmount: parseFloat(row.principal_amount),
    interestRate: parseFloat(row.interest_rate),
    durationMonths: row.duration_months,
    startDate: row.start_date,
    status: row.status,
    lender: row.lender,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformProfitAndLoss(row: any): ProfitAndLoss {
  return {
    id: row.id,
    month: row.month,
    totalRevenue: parseFloat(row.total_revenue),
    costOfGoodsSold: parseFloat(row.cost_of_goods_sold),
    operatingExpenses: parseFloat(row.operating_expenses),
    personnelCosts: parseFloat(row.personnel_costs),
    leasingCosts: parseFloat(row.leasing_costs),
    depreciation: parseFloat(row.depreciation),
    interestExpense: parseFloat(row.interest_expense),
    taxes: parseFloat(row.taxes),
    otherExpenses: parseFloat(row.other_expenses),
    grossProfit: parseFloat(row.gross_profit),
    operatingProfit: parseFloat(row.operating_profit),
    netProfit: parseFloat(row.net_profit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    
    if (!month) {
      return NextResponse.json({ error: 'Month parameter required (YYYY-MM)' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    
    // Fetch all related data
    const [workingCapitalResult, investmentsResult, loansResult, profitLossResult, previousBalanceSheetResult] = await Promise.all([
      supabase.from('working_capital').select('*').eq('month', month).single(),
      supabase.from('investments').select('*'),
      supabase.from('loans').select('*').eq('status', 'active'),
      supabase.from('profit_and_loss').select('*').eq('month', month).single(),
      supabase.from('balance_sheet').select('*').order('month', { ascending: false }).limit(1),
    ]);

    if (workingCapitalResult.error && workingCapitalResult.error.code !== 'PGRST116') throw workingCapitalResult.error;
    if (investmentsResult.error) throw investmentsResult.error;
    if (loansResult.error) throw loansResult.error;
    if (profitLossResult.error && profitLossResult.error.code !== 'PGRST116') throw profitLossResult.error;

    const workingCapital: WorkingCapital | null = workingCapitalResult.data ? transformWorkingCapital(workingCapitalResult.data) : null;
    const investments: Investment[] = (investmentsResult.data || []).map(transformInvestment);
    const loans: Loan[] = (loansResult.data || []).map(transformLoan);
    const profitLoss: ProfitAndLoss | null = profitLossResult.data ? transformProfitAndLoss(profitLossResult.data) : null;
    const previousBalanceSheet = previousBalanceSheetResult.data?.[0];

    // Calculate fixed assets (sum of investment book values)
    const { data: depreciationData } = await supabase
      .from('depreciation_entries')
      .select('*')
      .eq('month', month);

    const fixedAssets = depreciationData
      ? depreciationData.reduce((sum, entry) => sum + parseFloat(entry.book_value), 0)
      : investments.reduce((sum, inv) => sum + inv.amount, 0);

    // Calculate long-term debt (sum of remaining loan balances)
    const { data: loanSchedulesData } = await supabase
      .from('loan_schedules')
      .select('*')
      .eq('month', month === '2025-01' ? 1 : 12); // Simplified - would need proper month calculation

    const longTermDebt = loans.reduce((sum, loan) => {
      // Get remaining balance from loan schedules or calculate
      const schedule = loanSchedulesData?.find(s => s.loan_id === loan.id);
      return sum + (schedule ? parseFloat(schedule.remaining_balance) : loan.principalAmount);
    }, 0);

    // Get current assets and liabilities from working capital
    const currentAssets = workingCapital 
      ? workingCapital.accountsReceivable + workingCapital.inventory + workingCapital.otherCurrentAssets
      : 0;
    const currentLiabilities = workingCapital
      ? workingCapital.accountsPayable + workingCapital.otherCurrentLiabilities
      : 0;

    // Get share capital and retained earnings
    const shareCapital = previousBalanceSheet ? parseFloat(previousBalanceSheet.share_capital) : 0;
    const previousRetainedEarnings = previousBalanceSheet ? parseFloat(previousBalanceSheet.retained_earnings) : 0;
    const retainedEarnings = previousRetainedEarnings + (profitLoss?.netProfit || 0);

    // Calculate balance sheet
    const balanceSheet = calculateBalanceSheet(
      month,
      currentAssets,
      fixedAssets,
      0, // intangibleAssets - manual entry
      currentLiabilities,
      longTermDebt,
      shareCapital,
      retainedEarnings
    );

    // Save to database (upsert)
    const { data: saved, error: saveError } = await supabase
      .from('balance_sheet')
      .upsert({
        month: balanceSheet.month,
        current_assets: balanceSheet.currentAssets,
        fixed_assets: balanceSheet.fixedAssets,
        intangible_assets: balanceSheet.intangibleAssets,
        total_assets: balanceSheet.totalAssets,
        current_liabilities: balanceSheet.currentLiabilities,
        long_term_debt: balanceSheet.longTermDebt,
        total_liabilities: balanceSheet.totalLiabilities,
        share_capital: balanceSheet.shareCapital,
        retained_earnings: balanceSheet.retainedEarnings,
        total_equity: balanceSheet.totalEquity,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'month',
      })
      .select()
      .single();

    if (saveError) throw saveError;

    return NextResponse.json({
      id: saved.id,
      month: saved.month,
      currentAssets: parseFloat(saved.current_assets),
      fixedAssets: parseFloat(saved.fixed_assets),
      intangibleAssets: parseFloat(saved.intangible_assets),
      totalAssets: parseFloat(saved.total_assets),
      currentLiabilities: parseFloat(saved.current_liabilities),
      longTermDebt: parseFloat(saved.long_term_debt),
      totalLiabilities: parseFloat(saved.total_liabilities),
      shareCapital: parseFloat(saved.share_capital),
      retainedEarnings: parseFloat(saved.retained_earnings),
      totalEquity: parseFloat(saved.total_equity),
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    });
  } catch (error: any) {
    console.error('Error calculating balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to calculate balance sheet', details: error.message },
      { status: 500 }
    );
  }
}

