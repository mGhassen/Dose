// Cash Flow Projection API Route
// Calculates cash flow projections based on other financial data

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { CashFlowEntry, Sale, Expense, LeasingPayment, Personnel, LoanScheduleEntry } from '@kit/types';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startMonth = searchParams.get('start');
    const endMonth = searchParams.get('end');

    if (!startMonth || !endMonth) {
      return NextResponse.json(
        { error: 'start and end month parameters are required (YYYY-MM)' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Fetch all related data for the date range
    const startDate = `${startMonth}-01`;
    const endDateObj = new Date(`${endMonth}-01`);
    endDateObj.setMonth(endDateObj.getMonth() + 1);
    endDateObj.setDate(0);
    const endDate = endDateObj.toISOString().split('T')[0];

    const [salesResult, expensesResult, leasingResult, personnelResult, loansResult] = await Promise.all([
      supabase.from('sales').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('expenses').select('*').eq('is_active', true),
      supabase.from('leasing_payments').select('*').eq('is_active', true),
      supabase.from('personnel').select('*').eq('is_active', true),
      supabase.from('loan_schedules').select('*').gte('payment_date', startDate).lte('payment_date', endDate),
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (leasingResult.error) throw leasingResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (loansResult.error) throw loansResult.error;

    const sales: Sale[] = (salesResult.data || []).map(transformSale);
    const expenses: Expense[] = (expensesResult.data || []).map(transformExpense);
    const leasing: LeasingPayment[] = (leasingResult.data || []).map(transformLeasing);
    const personnel: Personnel[] = (personnelResult.data || []).map(transformPersonnel);
    const loanPayments: LoanScheduleEntry[] = (loansResult.data || []).map(transformLoanSchedule);

    // Project expenses for the date range
    const { projectExpense, expenseProjectionsToBudgetProjections } = await import('@/lib/calculations/expense-projections');
    const expenseProjections: Array<{ month: string; amount: number }> = [];
    const fullExpenseProjections: any[] = [];
    for (const expense of expenses) {
      const projections = projectExpense(expense, startMonth, endMonth);
      for (const proj of projections) {
        expenseProjections.push({ month: proj.month, amount: proj.amount });
        fullExpenseProjections.push(proj);
      }
    }

    // Project leasing for the date range
    const { projectLeasingPaymentsForRange, leasingProjectionsToBudgetProjections } = await import('@/lib/calculations/leasing-timeline');
    const leasingEntries = projectLeasingPaymentsForRange(leasing, startMonth, endMonth);
    const leasingProjections: Array<{ month: string; amount: number }> = [];
    for (const entry of leasingEntries) {
      leasingProjections.push({ month: entry.month, amount: entry.amount });
    }

    // Group by month
    const monthlyData: Record<string, {
      cashInflows: number;
      cashOutflows: number;
    }> = {};

    // Initialize all months
    let current = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    
    while (current <= end) {
      const month = current.toISOString().slice(0, 7);
      monthlyData[month] = { cashInflows: 0, cashOutflows: 0 };
      current.setMonth(current.getMonth() + 1);
    }

    // Calculate inflows (sales)
    for (const sale of sales) {
      const month = sale.date.slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].cashInflows += sale.amount;
      }
    }

    // Calculate outflows
    // Expenses
    for (const proj of expenseProjections) {
      if (monthlyData[proj.month]) {
        monthlyData[proj.month].cashOutflows += proj.amount;
      }
    }

    // Leasing (now using projections)
    for (const proj of leasingProjections) {
      if (monthlyData[proj.month]) {
        monthlyData[proj.month].cashOutflows += proj.amount;
      }
    }

    // Save projections to database
    // Save expense projections
    if (fullExpenseProjections.length > 0) {
      const budgetExpenseProjections = expenseProjectionsToBudgetProjections(fullExpenseProjections);
      await supabase
        .from('budget_projections')
        .delete()
        .eq('projection_type', 'expense')
        .gte('month', startMonth)
        .lte('month', endMonth);
      
      await supabase
        .from('budget_projections')
        .upsert(budgetExpenseProjections, {
          onConflict: 'projection_type,reference_id,month',
          ignoreDuplicates: false
        });
    }

    // Save leasing projections
    if (leasingEntries.length > 0) {
      const budgetLeasingProjections = leasingProjectionsToBudgetProjections(leasingEntries);
      await supabase
        .from('budget_projections')
        .delete()
        .eq('projection_type', 'leasing')
        .gte('month', startMonth)
        .lte('month', endMonth);
      
      await supabase
        .from('budget_projections')
        .upsert(budgetLeasingProjections, {
          onConflict: 'projection_type,reference_id,month',
          ignoreDuplicates: false
        });
    }


    // Personnel
    for (const person of personnel) {
      const personStart = new Date(person.startDate);
      const personEnd = person.endDate ? new Date(person.endDate) : null;
      let current = new Date(Math.max(new Date(startMonth + '-01').getTime(), personStart.getTime()));
      const finalDate = personEnd ? new Date(Math.min(end.getTime(), personEnd.getTime())) : end;

      while (current <= finalDate) {
        const month = current.toISOString().slice(0, 7);
        if (monthlyData[month]) {
          const charges = person.employerChargesType === 'percentage'
            ? person.baseSalary * (person.employerCharges / 100)
            : person.employerCharges;
          monthlyData[month].cashOutflows += person.baseSalary + charges;
        }
        current.setMonth(current.getMonth() + 1);
      }
    }

    // Loan payments
    for (const payment of loanPayments) {
      const month = payment.paymentDate.slice(0, 7);
      if (monthlyData[month]) {
        monthlyData[month].cashOutflows += payment.totalPayment;
      }
    }

    // Build projections
    const projections: CashFlowEntry[] = [];
    let openingBalance = 0; // Could fetch from previous month or set initial

    for (const month of Object.keys(monthlyData).sort()) {
      const data = monthlyData[month];
      const netCashFlow = data.cashInflows - data.cashOutflows;
      const closingBalance = openingBalance + netCashFlow;

      projections.push({
        id: 0,
        month,
        openingBalance,
        cashInflows: data.cashInflows,
        cashOutflows: data.cashOutflows,
        netCashFlow,
        closingBalance,
        notes: 'Auto-calculated projection',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      openingBalance = closingBalance;
    }

    return NextResponse.json(projections);
  } catch (error: any) {
    console.error('Error calculating cash flow projection:', error);
    return NextResponse.json(
      { error: 'Failed to calculate cash flow projection', details: error.message },
      { status: 500 }
    );
  }
}

