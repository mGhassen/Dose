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
    subscriptionId: row.subscription_id || undefined,
    description: row.description,
    vendor: row.vendor,
    expenseDate: row.expense_date || row.start_date, // Fallback for migration
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

    const [salesResult, expensesResult, subscriptionsResult, leasingResult, personnelResult, loansResult, actualPaymentsResult] = await Promise.all([
      supabase.from('sales').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('expenses').select('*'),
      supabase.from('subscriptions').select('*').eq('is_active', true),
      supabase.from('leasing_payments').select('*').eq('is_active', true),
      supabase.from('personnel').select('*').eq('is_active', true),
      supabase.from('loan_schedules').select('*').gte('payment_date', startDate).lte('payment_date', endDate),
      supabase.from('actual_payments').select('*').gte('month', startMonth).lte('month', endMonth),
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (subscriptionsResult.error) throw subscriptionsResult.error;
    if (leasingResult.error) throw leasingResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (loansResult.error) throw loansResult.error;
    if (actualPaymentsResult.error) throw actualPaymentsResult.error;

    const sales: Sale[] = (salesResult.data || []).map(transformSale);
    const expenses: Expense[] = (expensesResult.data || []).map(transformExpense);
    const subscriptions = subscriptionsResult.data || [];
    const leasing: LeasingPayment[] = (leasingResult.data || []).map(transformLeasing);
    const personnel: Personnel[] = (personnelResult.data || []).map(transformPersonnel);
    const loanPayments: LoanScheduleEntry[] = (loansResult.data || []).map(transformLoanSchedule);
    const actualPayments = actualPaymentsResult.data || [];

    // Separate actual payments by direction
    const inputPayments = actualPayments.filter((p: any) => p.direction === 'input' || !p.direction); // Default to input if missing
    const outputPayments = actualPayments.filter((p: any) => p.direction === 'output');

    // Project subscriptions for the date range (recurring expenses)
    const { projectSubscription } = await import('@/lib/calculations/subscription-projections');
    const subscriptionProjections: Array<{ month: string; amount: number }> = [];
    for (const subscription of subscriptions) {
      const projections = projectSubscription(subscription, startMonth, endMonth);
      for (const proj of projections) {
        subscriptionProjections.push({ month: proj.month, amount: proj.amount });
      }
    }

    // Get one-time expenses for the date range
    const oneTimeExpenses: Array<{ month: string; amount: number }> = [];
    for (const expense of expenses) {
      const expenseDate = expense.expenseDate || (expense as any).startDate; // Fallback for migration
      if (expenseDate) {
        const expenseMonth = expenseDate.slice(0, 7);
        if (expenseMonth >= startMonth && expenseMonth <= endMonth) {
          oneTimeExpenses.push({ month: expenseMonth, amount: expense.amount });
        }
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

    // Calculate inflows using actual input payments first, then fall back to sales declarations
    // Group input payments by month
    const inputPaymentsByMonth: Record<string, number> = {};
    for (const payment of inputPayments) {
      const month = payment.month;
      if (!inputPaymentsByMonth[month]) {
        inputPaymentsByMonth[month] = 0;
      }
      inputPaymentsByMonth[month] += parseFloat(payment.amount);
    }

    // Use actual input payments when available, otherwise use sales declarations
    for (const month of Object.keys(monthlyData)) {
      if (inputPaymentsByMonth[month]) {
        monthlyData[month].cashInflows = inputPaymentsByMonth[month];
      } else {
        // Fall back to sales declarations
        for (const sale of sales) {
          const saleMonth = sale.date.slice(0, 7);
          if (saleMonth === month) {
            monthlyData[month].cashInflows += sale.amount;
          }
        }
      }
    }

    // Calculate outflows using actual output payments first, then fall back to projections
    // Group output payments by month
    const outputPaymentsByMonth: Record<string, number> = {};
    for (const payment of outputPayments) {
      const month = payment.month;
      if (!outputPaymentsByMonth[month]) {
        outputPaymentsByMonth[month] = 0;
      }
      outputPaymentsByMonth[month] += parseFloat(payment.amount);
    }

    // Use actual output payments when available, otherwise use projections
    for (const month of Object.keys(monthlyData)) {
      if (outputPaymentsByMonth[month]) {
        monthlyData[month].cashOutflows = outputPaymentsByMonth[month];
      } else {
        // Fall back to projections (subscriptions, one-time expenses, leasing, personnel, loans)
        // Subscription projections (recurring expenses)
        for (const proj of subscriptionProjections) {
          if (proj.month === month) {
            monthlyData[month].cashOutflows += proj.amount;
          }
        }

        // One-time expenses
        for (const expense of oneTimeExpenses) {
          if (expense.month === month) {
            monthlyData[month].cashOutflows += expense.amount;
          }
        }

        // Leasing
        for (const proj of leasingProjections) {
          if (proj.month === month) {
            monthlyData[month].cashOutflows += proj.amount;
          }
        }
      }
    }

    // Save projections to database
    // Save subscription projections (recurring expenses)
    if (subscriptionProjections.length > 0) {
      const budgetSubscriptionProjections = subscriptionProjections.map(proj => ({
        projection_type: 'subscription',
        reference_id: null, // We don't track individual subscription IDs in budget_projections
        month: proj.month,
        amount: proj.amount,
        category: null,
        is_projected: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      await supabase
        .from('budget_projections')
        .delete()
        .eq('projection_type', 'subscription')
        .gte('month', startMonth)
        .lte('month', endMonth);
      
      await supabase
        .from('budget_projections')
        .upsert(budgetSubscriptionProjections, {
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


    // Add personnel and loan payments only if no actual output payments exist for that month
    for (const month of Object.keys(monthlyData)) {
      if (!outputPaymentsByMonth[month]) {
        // Personnel
        for (const person of personnel) {
          const personStart = new Date(person.startDate);
          const personEnd = person.endDate ? new Date(person.endDate) : null;
          const monthDate = new Date(month + '-01');
          
          if (monthDate >= personStart && (!personEnd || monthDate <= personEnd)) {
            const charges = person.employerChargesType === 'percentage'
              ? person.baseSalary * (person.employerCharges / 100)
              : person.employerCharges;
            monthlyData[month].cashOutflows += person.baseSalary + charges;
          }
        }

        // Loan payments
        for (const payment of loanPayments) {
          const paymentMonth = payment.paymentDate.slice(0, 7);
          if (paymentMonth === month) {
            monthlyData[month].cashOutflows += payment.totalPayment;
          }
        }
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

