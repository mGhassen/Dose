// Income Statement API Route
// Aggregates actual data from database for income statement

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { ExpenseCategory, SalesType } from '@kit/types';

interface IncomeStatementData {
  // Revenue
  sales: {
    byType: Record<SalesType, { total: number; items: Array<{ id: number; date: string; amount: number; description?: string }> }>;
    total: number;
  };
  
  // Expenses
  expenses: {
    byCategory: Record<ExpenseCategory | string, { total: number; items: Array<{ id: number; name: string; amount: number; date: string; description?: string }> }>;
    total: number;
  };
  
  // Personnel
  personnel: {
    totalSalary: number;
    totalCharges: number;
    totalCost: number;
    headcount: number;
    items: Array<{ id: number; name: string; salary: number; charges: number; total: number }>;
  };
  
  // Leasing
  leasing: {
    total: number;
    items: Array<{ id: number; name: string; amount: number }>;
  };
  
  // Depreciation
  depreciation: {
    total: number;
    items: Array<{ id: number; investmentName: string; amount: number }>;
  };
  
  // Interest (from loans)
  interest: {
    total: number;
    items: Array<{ id: number; loanName: string; amount: number; date: string }>;
  };
  
  // Taxes (from variables)
  taxes: {
    total: number;
    items: Array<{ id: number; name: string; amount: number }>;
  };
  
  // COGS (Cost of Goods Sold - expenses with category 'supplies')
  costOfGoodsSold: number;
  
  // Calculated totals
  totalRevenue: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  netProfit: number;
}

function transformSale(row: any) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description || null,
  };
}

function transformExpense(row: any) {
  return {
    id: row.id,
    name: row.name,
    amount: parseFloat(row.amount),
    date: row.expense_date || row.start_date,
    description: row.description || null,
    category: row.category,
  };
}

function transformPersonnel(row: any) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    baseSalary: parseFloat(row.base_salary),
    employerCharges: parseFloat(row.employer_charges),
    employerChargesType: row.employer_charges_type,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: row.is_active,
  };
}

function transformLeasing(row: any) {
  return {
    id: row.id,
    name: row.name,
    amount: parseFloat(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    frequency: row.frequency,
    isActive: row.is_active,
  };
}

function transformDepreciation(row: any, investmentName: string) {
  return {
    id: row.id,
    investmentId: row.investment_id,
    investmentName: investmentName,
    amount: parseFloat(row.depreciation_amount),
  };
}

function transformLoanSchedule(row: any) {
  const loan = Array.isArray(row.loans) ? row.loans[0] : row.loans || {};
  return {
    id: row.id,
    loanName: loan.name || 'Unknown',
    amount: parseFloat(row.interest_payment),
    date: row.payment_date,
  };
}

function transformVariable(row: any) {
  return {
    id: row.id,
    name: row.name,
    value: parseFloat(row.value),
    type: row.type,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const quarter = searchParams.get('quarter'); // Q1, Q2, Q3, Q4
    const month = searchParams.get('month'); // YYYY-MM
    
    if (!year && !month) {
      return NextResponse.json(
        { error: 'year or month parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    
    // Determine date range
    let startDate: string;
    let endDate: string;
    
    if (month) {
      startDate = `${month}-01`;
      const endDateObj = new Date(`${month}-01`);
      endDateObj.setMonth(endDateObj.getMonth() + 1);
      endDateObj.setDate(0);
      endDate = endDateObj.toISOString().split('T')[0];
    } else if (quarter && year) {
      const quarterNum = parseInt(quarter.replace('Q', ''));
      const quarterStartMonth = (quarterNum - 1) * 3 + 1;
      startDate = `${year}-${String(quarterStartMonth).padStart(2, '0')}-01`;
      const quarterEndMonth = quarterNum * 3;
      const endDateObj = new Date(parseInt(year), quarterEndMonth, 0);
      endDate = endDateObj.toISOString().split('T')[0];
    } else {
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }

    // Fetch all actual data
    const [
      salesResult,
      expensesResult,
      personnelResult,
      leasingResult,
      depreciationResult,
      loansResult,
      variablesResult,
      investmentsResult
    ] = await Promise.all([
      // Sales
      supabase
        .from('sales')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true }),
      
      // Expenses
      supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate),
      
      // Personnel (active during period)
      supabase
        .from('personnel')
        .select('*')
        .eq('is_active', true),
      
      // Leasing (active)
      supabase
        .from('leasing_payments')
        .select('*')
        .eq('is_active', true),
      
      // Depreciation entries
      supabase
        .from('depreciation_entries')
        .select('*')
        .gte('month', startDate.substring(0, 7))
        .lte('month', endDate.substring(0, 7)),
      
      // Loan schedules (for interest) - join with loans table
      supabase
        .from('loan_schedules')
        .select(`
          *,
          loans (
            name
          )
        `)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate),
      
      // Variables (taxes)
      supabase
        .from('variables')
        .select('*')
        .eq('type', 'tax')
        .eq('is_active', true)
        .lte('effective_date', endDate)
        .or(`end_date.is.null,end_date.gte.${startDate}`),
      
      // Investments (for depreciation names)
      supabase
        .from('investments')
        .select('id, name'),
    ]);

    if (salesResult.error) throw salesResult.error;
    if (expensesResult.error) throw expensesResult.error;
    if (personnelResult.error) throw personnelResult.error;
    if (leasingResult.error) throw leasingResult.error;
    if (depreciationResult.error) throw depreciationResult.error;
    if (loansResult.error) throw loansResult.error;
    if (variablesResult.error) throw variablesResult.error;
    if (investmentsResult.error) throw investmentsResult.error;

    const sales = (salesResult.data || []).map(transformSale);
    const expenses = (expensesResult.data || []).map(transformExpense);
    const personnel = (personnelResult.data || []).map(transformPersonnel);
    const leasing = (leasingResult.data || []).map(transformLeasing);
    const variables = (variablesResult.data || []).map(transformVariable);
    
    // Create investment name map first
    const investments = (investmentsResult.data || []).reduce((acc, inv) => {
      acc[inv.id] = inv.name;
      return acc;
    }, {} as Record<number, string>);
    
    // Map depreciation with investment names
    const depreciation = (depreciationResult.data || []).map(d => {
      const investmentId = d.investment_id;
      const invName = investments[investmentId] || 'Unknown';
      return transformDepreciation(d, invName);
    });
    
    const loanSchedules = (loansResult.data || []).map(transformLoanSchedule);

    // Filter personnel active during the period
    const periodStart = new Date(startDate);
    const periodEnd = new Date(endDate);
    const activePersonnel = personnel.filter(p => {
      const start = new Date(p.startDate);
      const end = p.endDate ? new Date(p.endDate) : null;
      return start <= periodEnd && (!end || end >= periodStart);
    });

    // Filter leasing active during the period
    const activeLeasing = leasing.filter(l => {
      const start = new Date(l.startDate);
      const end = l.endDate ? new Date(l.endDate) : null;
      return start <= periodEnd && (!end || end >= periodStart);
    });

    // Group sales by type
    const salesByType: Record<SalesType, { total: number; items: any[] }> = {
      on_site: { total: 0, items: [] },
      delivery: { total: 0, items: [] },
      takeaway: { total: 0, items: [] },
      catering: { total: 0, items: [] },
      other: { total: 0, items: [] },
    };

    sales.forEach(sale => {
      const type = sale.type || 'other';
      if (salesByType[type as SalesType]) {
        salesByType[type as SalesType].items.push({
          id: sale.id,
          date: sale.date,
          amount: sale.amount,
          description: sale.description,
        });
        salesByType[type as SalesType].total += sale.amount;
      }
    });

    const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

    // Group expenses by category
    const expensesByCategory: Record<string, { total: number; items: any[] }> = {};
    expenses.forEach(exp => {
      const category = exp.category || 'other';
      if (!expensesByCategory[category]) {
        expensesByCategory[category] = { total: 0, items: [] };
      }
      expensesByCategory[category].items.push(exp);
      expensesByCategory[category].total += exp.amount;
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const costOfGoodsSold = expenses
      .filter(e => e.category === 'supplies')
      .reduce((sum, e) => sum + e.amount, 0);

    // Calculate personnel costs
    let totalPersonnelSalary = 0;
    let totalPersonnelCharges = 0;
    const personnelItems = activePersonnel.map(p => {
      const charges = p.employerChargesType === 'percentage'
        ? p.baseSalary * (p.employerCharges / 100)
        : p.employerCharges;
      const total = p.baseSalary + charges;
      totalPersonnelSalary += p.baseSalary;
      totalPersonnelCharges += charges;
      return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        salary: p.baseSalary,
        charges: charges,
        total: total,
      };
    });

    // Calculate leasing costs (only for active leasing in period)
    const leasingItems = activeLeasing.map(l => ({
      id: l.id,
      name: l.name,
      amount: l.amount,
    }));
    const totalLeasing = leasingItems.reduce((sum, l) => sum + l.amount, 0);

    // Depreciation
    const depreciationItems = depreciation.map(d => ({
      id: d.id,
      investmentName: d.investmentName,
      amount: d.amount,
    }));
    const totalDepreciation = depreciationItems.reduce((sum, d) => sum + d.amount, 0);

    // Interest from loans
    const interestItems = loanSchedules.map(ls => ({
      id: ls.id,
      loanName: ls.loanName,
      amount: ls.amount,
      date: ls.date,
    }));
    const totalInterest = interestItems.reduce((sum, i) => sum + i.amount, 0);

    // Taxes from variables
    const taxItems = variables.map(v => ({
      id: v.id,
      name: v.name,
      amount: v.value, // Tax rate applied to revenue
    }));
    // Calculate actual tax amount from revenue
    const taxRate = variables.reduce((sum, v) => sum + v.value, 0);
    const totalTaxes = totalSales * (taxRate / 100);

    // Calculate totals
    const grossProfit = totalSales - costOfGoodsSold;
    const totalOperatingExpenses = totalExpenses - costOfGoodsSold + totalPersonnelSalary + totalPersonnelCharges + totalLeasing + totalDepreciation;
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit - totalInterest - totalTaxes;

    const incomeStatement: IncomeStatementData = {
      sales: {
        byType: salesByType,
        total: totalSales,
      },
      expenses: {
        byCategory: expensesByCategory,
        total: totalExpenses,
      },
      personnel: {
        totalSalary: totalPersonnelSalary,
        totalCharges: totalPersonnelCharges,
        totalCost: totalPersonnelSalary + totalPersonnelCharges,
        headcount: activePersonnel.length,
        items: personnelItems,
      },
      leasing: {
        total: totalLeasing,
        items: leasingItems,
      },
      depreciation: {
        total: totalDepreciation,
        items: depreciationItems,
      },
      interest: {
        total: totalInterest,
        items: interestItems,
      },
      taxes: {
        total: totalTaxes,
        items: taxItems,
      },
      costOfGoodsSold,
      totalRevenue: totalSales,
      grossProfit,
      totalOperatingExpenses,
      operatingProfit,
      netProfit,
    };

    return NextResponse.json(incomeStatement);
  } catch (error: any) {
    console.error('Error fetching income statement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch income statement', details: error.message },
      { status: 500 }
    );
  }
}

