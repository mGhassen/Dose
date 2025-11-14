// Calculate Profit and Loss API Route
// Auto-calculates P&L from all financial data

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import { calculateProfitAndLoss } from '@/lib/calculations/financial-statements';
import type { ProfitAndLoss, Sale, Expense, Personnel, LeasingPayment, DepreciationEntry, LoanScheduleEntry, Variable, ExpenseCategory } from '@kit/types';

function transformSale(row: any): Sale {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    quantity: row.quantity,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

function transformPersonnel(row: any): Personnel {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    position: row.position,
    type: row.type,
    baseSalary: parseFloat(row.base_salary),
    employerCharges: parseFloat(row.employer_charges),
    employerChargesType: row.employer_charges_type,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformLeasing(row: any): LeasingPayment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: parseFloat(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    description: row.description,
    lessor: row.lessor,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function transformDepreciation(row: any): DepreciationEntry {
  return {
    id: row.id,
    investmentId: row.investment_id,
    month: row.month,
    depreciationAmount: parseFloat(row.depreciation_amount),
    accumulatedDepreciation: parseFloat(row.accumulated_depreciation),
    bookValue: parseFloat(row.book_value),
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

function transformVariable(row: any): Variable {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: parseFloat(row.value),
    unit: row.unit,
    effectiveDate: row.effective_date,
    endDate: row.end_date,
    description: row.description,
    isActive: row.is_active,
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
    
    // Get date range for the month
    const startDate = `${month}-01`;
    const endDateObj = new Date(`${month}-01`);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    endDateObj.setDate(0);
    const endDate = endDateObj.toISOString().split('T')[0];

    // Fetch all related data
    const [salesResult, expensesResult, personnelResult, leasingResult, depreciationResult, loansResult, variablesResult] = await Promise.all([
      supabase.from('sales').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('expenses').select('*').eq('is_active', true),
      supabase.from('personnel').select('*').eq('is_active', true),
      supabase.from('leasing_payments').select('*').eq('is_active', true),
      supabase.from('depreciation_entries').select('*').eq('month', month),
      supabase.from('loan_schedules').select('*').gte('payment_date', startDate).lte('payment_date', endDate),
      supabase.from('variables').select('*').eq('type', 'tax').eq('is_active', true).lte('effective_date', endDate).or(`end_date.is.null,end_date.gte.${startDate}`),
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (leasingResult.error) throw leasingResult.error;
    if (depreciationResult.error) throw depreciationResult.error;
    if (loansResult.error) throw loansResult.error;
    if (variablesResult.error) throw variablesResult.error;

    const sales: Sale[] = (salesResult.data || []).map(transformSale);
    const expenses: Expense[] = (expensesResult.data || []).map(transformExpense);
    const personnel: Personnel[] = (personnelResult.data || []).map(transformPersonnel);
    const leasing: LeasingPayment[] = (leasingResult.data || []).map(transformLeasing);
    const depreciation: DepreciationEntry[] = (depreciationResult.data || []).map(transformDepreciation);
    const loanPayments: LoanScheduleEntry[] = (loansResult.data || []).map(transformLoanSchedule);
    const taxVariables: Variable[] = (variablesResult.data || []).map(transformVariable);

    // Get tax rate (use the most recent active tax variable)
    const taxRate = taxVariables.length > 0 
      ? taxVariables.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime())[0].value
      : 0;

    // Project expenses for the month
    const { projectExpense } = await import('@/lib/calculations/expense-projections');
    const monthExpenses: Expense[] = [];
    for (const expense of expenses) {
      const projections = projectExpense(expense, month, month);
      if (projections.length > 0) {
        monthExpenses.push({
          ...expense,
          amount: projections[0].amount,
        });
      }
    }

    // Filter personnel active in this month
    const monthDate = new Date(`${month}-01`);
    const activePersonnel = personnel.filter(p => {
      const personStart = new Date(p.startDate);
      const personEnd = p.endDate ? new Date(p.endDate) : null;
      return personStart <= monthDate && (!personEnd || personEnd >= monthDate);
    });

    // Filter leasing active in this month
    const activeLeasing = leasing.filter(l => {
      const leaseStart = new Date(l.startDate);
      const leaseEnd = l.endDate ? new Date(l.endDate) : null;
      
      if (leaseStart > monthDate || (leaseEnd && leaseEnd < monthDate)) {
        return false;
      }

      // Check if payment occurs this month based on frequency
      switch (l.frequency) {
        case 'monthly':
          return true;
        case 'quarterly':
          return monthDate.getMonth() % 3 === leaseStart.getMonth() % 3;
        case 'yearly':
          return monthDate.getMonth() === leaseStart.getMonth();
        default:
          return true;
      }
    });

    // Calculate P&L
    const profitAndLoss = calculateProfitAndLoss(
      month,
      sales,
      monthExpenses,
      activePersonnel,
      activeLeasing,
      depreciation,
      loanPayments,
      taxRate
    );

    // Save to database (upsert)
    const { data: saved, error: saveError } = await supabase
      .from('profit_and_loss')
      .upsert({
        month: profitAndLoss.month,
        total_revenue: profitAndLoss.totalRevenue,
        cost_of_goods_sold: profitAndLoss.costOfGoodsSold,
        operating_expenses: profitAndLoss.operatingExpenses,
        personnel_costs: profitAndLoss.personnelCosts,
        leasing_costs: profitAndLoss.leasingCosts,
        depreciation: profitAndLoss.depreciation,
        interest_expense: profitAndLoss.interestExpense,
        taxes: profitAndLoss.taxes,
        other_expenses: profitAndLoss.otherExpenses,
        gross_profit: profitAndLoss.grossProfit,
        operating_profit: profitAndLoss.operatingProfit,
        net_profit: profitAndLoss.netProfit,
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
      totalRevenue: parseFloat(saved.total_revenue),
      costOfGoodsSold: parseFloat(saved.cost_of_goods_sold),
      operatingExpenses: parseFloat(saved.operating_expenses),
      personnelCosts: parseFloat(saved.personnel_costs),
      leasingCosts: parseFloat(saved.leasing_costs),
      depreciation: parseFloat(saved.depreciation),
      interestExpense: parseFloat(saved.interest_expense),
      taxes: parseFloat(saved.taxes),
      otherExpenses: parseFloat(saved.other_expenses),
      grossProfit: parseFloat(saved.gross_profit),
      operatingProfit: parseFloat(saved.operating_profit),
      netProfit: parseFloat(saved.net_profit),
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    });
  } catch (error: any) {
    console.error('Error calculating profit and loss:', error);
    return NextResponse.json(
      { error: 'Failed to calculate profit and loss', details: error.message },
      { status: 500 }
    );
  }
}

