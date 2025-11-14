// Expense Projection Calculation Service
// Projects all expenses for annual budgeting based on recurrence patterns

import type { 
  Expense, 
  ExpenseProjection
} from '@kit/types';
import { ExpenseRecurrence, ExpenseCategory } from '@kit/types';

/**
 * Project a single expense across a date range based on its recurrence pattern
 */
export function projectExpense(
  expense: Expense,
  startMonth: string, // YYYY-MM
  endMonth: string // YYYY-MM
): ExpenseProjection[] {
  const projections: ExpenseProjection[] = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  end.setMonth(end.getMonth() + 1); // Set to first day of next month for comparison
  end.setDate(0); // Then go back to last day of target month
  
  const expenseStart = new Date(expense.startDate);
  const expenseEnd = expense.endDate ? new Date(expense.endDate) : null;

  // Only project active expenses
  if (!expense.isActive) {
    return projections;
  }

  // Handle one-time expenses
  if (expense.recurrence === ExpenseRecurrence.ONE_TIME) {
    const expenseMonth = expenseStart.toISOString().slice(0, 7); // YYYY-MM
    if (expenseMonth >= startMonth && expenseMonth <= endMonth) {
      // Check if expense date is within range
      if (expenseStart >= start && expenseStart <= end) {
        // Check if expense hasn't ended yet
        if (!expenseEnd || expenseStart <= expenseEnd) {
          projections.push({
            month: expenseMonth,
            expenseId: expense.id,
            expenseName: expense.name,
            category: expense.category,
            amount: expense.amount,
            isProjected: expenseStart > new Date(), // Projected if in the future
          });
        }
      }
    }
    return projections;
  }

  // Handle recurring expenses
  let currentDate = new Date(Math.max(start.getTime(), expenseStart.getTime()));
  const finalDate = expenseEnd 
    ? new Date(Math.min(end.getTime(), expenseEnd.getTime())) 
    : end;

  while (currentDate <= finalDate) {
    const month = currentDate.toISOString().slice(0, 7); // YYYY-MM

    let shouldInclude = false;
    const amount = expense.amount;

    switch (expense.recurrence) {
      case ExpenseRecurrence.MONTHLY:
        // Include every month
        shouldInclude = true;
        break;

      case ExpenseRecurrence.QUARTERLY:
        // Include every 3 months (Jan, Apr, Jul, Oct)
        const monthNum = currentDate.getMonth();
        const startMonthNum = expenseStart.getMonth();
        shouldInclude = (monthNum - startMonthNum) % 3 === 0 && 
                       monthNum >= startMonthNum;
        break;

      case ExpenseRecurrence.YEARLY:
        // Include same month every year
        shouldInclude = currentDate.getMonth() === expenseStart.getMonth();
        break;

      case ExpenseRecurrence.CUSTOM:
        // For custom, treat as monthly for now
        // TODO: Add custom recurrence logic if needed
        shouldInclude = true;
        break;
    }

    if (shouldInclude) {
      projections.push({
        month,
        expenseId: expense.id,
        expenseName: expense.name,
        category: expense.category,
        amount,
        isProjected: currentDate > new Date(), // Projected if in the future
      });
    }

    // Move to next month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return projections;
}

/**
 * Project all expenses for a given year
 */
export function projectExpensesForYear(
  expenses: Expense[],
  year: string // YYYY
): ExpenseProjection[] {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  const allProjections: ExpenseProjection[] = [];

  for (const expense of expenses) {
    const projections = projectExpense(expense, startMonth, endMonth);
    allProjections.push(...projections);
  }

  return allProjections.sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Convert expense projections to budget projection format for database storage
 */
export function expenseProjectionsToBudgetProjections(
  projections: ExpenseProjection[]
): Array<{
  projection_type: string;
  reference_id: number;
  month: string;
  amount: number;
  category: string;
  is_projected: boolean;
}> {
  return projections.map(proj => ({
    projection_type: 'expense',
    reference_id: proj.expenseId,
    month: proj.month,
    amount: proj.amount,
    category: proj.category,
    is_projected: proj.isProjected,
  }));
}

/**
 * Calculate annual budget summary
 */
export function calculateAnnualBudgetSummary(
  projections: ExpenseProjection[],
  year: string
): {
  totalAnnual: number;
  monthlyAverage: number;
  byCategory: Record<ExpenseCategory, {
    total: number;
    monthlyAverage: number;
    count: number;
  }>;
  monthlyBreakdown: Array<{
    month: string;
    total: number;
    byCategory: Record<ExpenseCategory, number>;
  }>;
} {
  // Initialize category totals
  const categoryTotals: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const monthlyTotals: Record<string, number> = {};
  const monthlyByCategory: Record<string, Record<string, number>> = {};

  // Initialize all categories
  Object.values(ExpenseCategory).forEach(cat => {
    categoryTotals[cat] = 0;
    categoryCounts[cat] = 0;
  });

  // Process projections
  for (const projection of projections) {
    // Category totals
    categoryTotals[projection.category] = (categoryTotals[projection.category] || 0) + projection.amount;
    categoryCounts[projection.category] = (categoryCounts[projection.category] || 0) + 1;

    // Monthly totals
    monthlyTotals[projection.month] = (monthlyTotals[projection.month] || 0) + projection.amount;

    // Monthly by category
    if (!monthlyByCategory[projection.month]) {
      monthlyByCategory[projection.month] = {};
      Object.values(ExpenseCategory).forEach(cat => {
        monthlyByCategory[projection.month][cat] = 0;
      });
    }
    monthlyByCategory[projection.month][projection.category] += projection.amount;
  }

  // Calculate totals
  const totalAnnual = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  const monthlyAverage = totalAnnual / 12;

  // Build category summary
  const byCategory: Record<ExpenseCategory, {
    total: number;
    monthlyAverage: number;
    count: number;
  }> = {} as any;

  Object.values(ExpenseCategory).forEach(cat => {
    byCategory[cat] = {
      total: categoryTotals[cat] || 0,
      monthlyAverage: (categoryTotals[cat] || 0) / 12,
      count: categoryCounts[cat] || 0,
    };
  });

  // Build monthly breakdown
  const monthlyBreakdown = Object.keys(monthlyTotals)
    .sort()
    .map(month => ({
      month,
      total: monthlyTotals[month],
      byCategory: monthlyByCategory[month] || {},
    }));

  return {
    totalAnnual,
    monthlyAverage,
    byCategory,
    monthlyBreakdown,
  };
}

/**
 * Get monthly budget for a specific month
 */
export function getMonthlyBudget(
  projections: ExpenseProjection[],
  month: string // YYYY-MM
): {
  month: string;
  total: number;
  byCategory: Record<ExpenseCategory, number>;
  expenses: ExpenseProjection[];
} {
  const monthProjections = projections.filter(p => p.month === month);
  
  const byCategory: Record<string, number> = {};
  Object.values(ExpenseCategory).forEach(cat => {
    byCategory[cat] = 0;
  });

  let total = 0;
  for (const projection of monthProjections) {
    byCategory[projection.category] = (byCategory[projection.category] || 0) + projection.amount;
    total += projection.amount;
  }

  return {
    month,
    total,
    byCategory: byCategory as Record<ExpenseCategory, number>,
    expenses: monthProjections,
  };
}

