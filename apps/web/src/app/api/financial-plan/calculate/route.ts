// Calculate Financial Plan API Route
// Auto-calculates financial plan from other data

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { calculateFinancialPlan } from '@/lib/calculations/financial-statements';
import type { Loan, Investment, WorkingCapital, LoanScheduleEntry } from '@kit/types';

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

function transformLoanSchedule(row: any): LoanScheduleEntry {
  return {
    id: row.id,
    loanId: row.loan_id,
    month: row.month,
    paymentDate: row.payment_date,
    principalPayment: parseFloat(row.principal_payment),
    interestPayment: parseFloat(row.interest_payment),
    totalPayment: parseFloat(row.total_payment),
    remainingBalance: parseFloat(row.remaining_balance),
    isPaid: row.is_paid,
    paidDate: row.paid_date,
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
    
    // Get date range for the month
    const startDate = `${month}-01`;
    const endDateObj = new Date(`${month}-01`);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    endDateObj.setDate(0);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Fetch all related data
    const [loansResult, investmentsResult, workingCapitalResult, loanSchedulesResult, previousFinancialPlanResult] = await Promise.all([
      supabase.from('loans').select('*').gte('start_date', startDate).lte('start_date', endDate).eq('status', 'active'),
      supabase.from('investments').select('*').gte('purchase_date', startDate).lte('purchase_date', endDate),
      supabase.from('working_capital').select('*').eq('month', month).single(),
      supabase.from('loan_schedules').select('*').gte('payment_date', startDate).lte('payment_date', endDate),
      supabase.from('financial_plan').select('*').order('month', { ascending: false }).limit(1),
    ]);

    if (loansResult.error) throw loansResult.error;
    if (investmentsResult.error) throw investmentsResult.error;
    if (workingCapitalResult.error && workingCapitalResult.error.code !== 'PGRST116') throw workingCapitalResult.error;
    if (loanSchedulesResult.error) throw loanSchedulesResult.error;

    const newLoans: Loan[] = (loansResult.data || []).map(transformLoan);
    const newInvestments: Investment[] = (investmentsResult.data || []).map(transformInvestment);
    const workingCapital: WorkingCapital | null = workingCapitalResult.data ? transformWorkingCapital(workingCapitalResult.data) : null;
    const loanPayments: LoanScheduleEntry[] = (loanSchedulesResult.data || []).map(transformLoanSchedule);
    const previousFinancialPlan = previousFinancialPlanResult.data?.[0];

    // Calculate values
    const equity = previousFinancialPlan ? parseFloat(previousFinancialPlan.equity) : 0;
    const loans = newLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
    const otherSources = 0; // Manual entry
    const investments = newInvestments.reduce((sum, inv) => sum + inv.amount, 0);
    const workingCapitalNeed = workingCapital ? workingCapital.workingCapitalNeed : 0;
    const loanRepayments = loanPayments.reduce((sum, payment) => sum + payment.totalPayment, 0);
    const otherUses = 0; // Manual entry

    // Calculate financial plan
    const financialPlan = calculateFinancialPlan(
      month,
      equity,
      loans,
      otherSources,
      investments,
      workingCapitalNeed,
      loanRepayments,
      otherUses
    );

    // Save to database (upsert)
    const { data: saved, error: saveError } = await supabase
      .from('financial_plan')
      .upsert({
        month: financialPlan.month,
        equity: financialPlan.equity,
        loans: financialPlan.loans,
        other_sources: financialPlan.otherSources,
        total_sources: financialPlan.totalSources,
        investments: financialPlan.investments,
        working_capital: financialPlan.workingCapital,
        loan_repayments: financialPlan.loanRepayments,
        other_uses: financialPlan.otherUses,
        total_uses: financialPlan.totalUses,
        net_financing: financialPlan.netFinancing,
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
      equity: parseFloat(saved.equity),
      loans: parseFloat(saved.loans),
      otherSources: parseFloat(saved.other_sources),
      totalSources: parseFloat(saved.total_sources),
      investments: parseFloat(saved.investments),
      workingCapital: parseFloat(saved.working_capital),
      loanRepayments: parseFloat(saved.loan_repayments),
      otherUses: parseFloat(saved.other_uses),
      totalUses: parseFloat(saved.total_uses),
      netFinancing: parseFloat(saved.net_financing),
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    });
  } catch (error: any) {
    console.error('Error calculating financial plan:', error);
    return NextResponse.json(
      { error: 'Failed to calculate financial plan', details: error.message },
      { status: 500 }
    );
  }
}

