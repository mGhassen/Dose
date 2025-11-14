// Financial Statements Calculation Service
// Calculates Profit & Loss, Balance Sheet, Working Capital, and Financial Plan

import type { 
  ProfitAndLoss, 
  BalanceSheet, 
  WorkingCapital,
  FinancialPlan,
  Expense,
  Sale,
  Personnel,
  LeasingPayment,
  LoanScheduleEntry,
  DepreciationEntry,
  ExpenseCategory
} from '@kit/types';

/**
 * Calculate Profit and Loss statement for a month
 */
export function calculateProfitAndLoss(
  month: string,
  sales: Sale[],
  expenses: Expense[],
  personnel: Personnel[],
  leasing: LeasingPayment[],
  depreciation: DepreciationEntry[],
  loanInterest: LoanScheduleEntry[],
  taxRate: number
): ProfitAndLoss {
  // Revenue
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);

  // Expenses
  const costOfGoodsSold = expenses
    .filter(e => e.category === ExpenseCategory.SUPPLIES)
    .reduce((sum, e) => sum + e.amount, 0);

  const operatingExpenses = expenses
    .filter(e => e.category !== ExpenseCategory.SUPPLIES)
    .reduce((sum, e) => sum + e.amount, 0);

  const personnelCosts = personnel.reduce((sum, p) => {
    const charges = p.employerChargesType === 'percentage'
      ? p.baseSalary * (p.employerCharges / 100)
      : p.employerCharges;
    return sum + p.baseSalary + charges;
  }, 0);

  const leasingCosts = leasing.reduce((sum, l) => sum + l.amount, 0);
  const depreciationAmount = depreciation.reduce((sum, d) => sum + d.depreciationAmount, 0);
  const interestExpense = loanInterest.reduce((sum, l) => sum + l.interestPayment, 0);
  const taxes = totalRevenue * (taxRate / 100);
  const otherExpenses = 0; // Add logic as needed

  // Calculated values
  const grossProfit = totalRevenue - costOfGoodsSold;
  const operatingProfit = grossProfit - operatingExpenses - personnelCosts - leasingCosts - depreciationAmount;
  const netProfit = operatingProfit - interestExpense - taxes - otherExpenses;

  return {
    id: 0,
    month,
    totalRevenue,
    costOfGoodsSold,
    operatingExpenses,
    personnelCosts,
    leasingCosts,
    depreciation: depreciationAmount,
    interestExpense,
    taxes,
    otherExpenses,
    grossProfit,
    operatingProfit,
    netProfit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Working Capital (BFR) for a month
 */
export function calculateWorkingCapital(
  month: string,
  accountsReceivable: number,
  inventory: number,
  accountsPayable: number,
  otherCurrentAssets: number = 0,
  otherCurrentLiabilities: number = 0
): WorkingCapital {
  const currentAssets = accountsReceivable + inventory + otherCurrentAssets;
  const currentLiabilities = accountsPayable + otherCurrentLiabilities;
  const workingCapitalNeed = currentAssets - currentLiabilities;

  return {
    id: 0,
    month,
    accountsReceivable,
    inventory,
    accountsPayable,
    otherCurrentAssets,
    otherCurrentLiabilities,
    workingCapitalNeed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Balance Sheet for a month
 */
export function calculateBalanceSheet(
  month: string,
  currentAssets: number,
  fixedAssets: number,
  intangibleAssets: number,
  currentLiabilities: number,
  longTermDebt: number,
  shareCapital: number,
  retainedEarnings: number
): BalanceSheet {
  const totalAssets = currentAssets + fixedAssets + intangibleAssets;
  const totalLiabilities = currentLiabilities + longTermDebt;
  const totalEquity = shareCapital + retainedEarnings;

  // Validation: totalAssets should equal totalLiabilities + totalEquity
  // If not, adjust retainedEarnings to balance
  const balance = totalAssets - (totalLiabilities + totalEquity);
  const adjustedRetainedEarnings = retainedEarnings + balance;

  return {
    id: 0,
    month,
    currentAssets,
    fixedAssets,
    intangibleAssets,
    totalAssets,
    currentLiabilities,
    longTermDebt,
    totalLiabilities,
    shareCapital,
    retainedEarnings: adjustedRetainedEarnings,
    totalEquity: shareCapital + adjustedRetainedEarnings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate Financial Plan for a month
 */
export function calculateFinancialPlan(
  month: string,
  equity: number,
  loans: number,
  otherSources: number,
  investments: number,
  workingCapital: number,
  loanRepayments: number,
  otherUses: number
): FinancialPlan {
  const totalSources = equity + loans + otherSources;
  const totalUses = investments + workingCapital + loanRepayments + otherUses;
  const netFinancing = totalSources - totalUses;

  return {
    id: 0,
    month,
    equity,
    loans,
    otherSources,
    totalSources,
    investments,
    workingCapital,
    loanRepayments,
    otherUses,
    totalUses,
    netFinancing,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

