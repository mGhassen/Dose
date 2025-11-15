// React Query hook for Expenses Analytics

import { useQuery } from '@tanstack/react-query';

export interface ExpensesAnalytics {
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  recurrenceBreakdown: Array<{ recurrence: string; amount: number; percentage: number }>;
  monthlyTrend: Array<{ month: string; total: number; [key: string]: number | string }>;
  topExpenses: Array<{ id: number; name: string; category: string; monthlyAmount: number; annualCost: number }>;
  summary: {
    totalExpenses: number;
    totalActiveExpenses: number;
    totalMonthly: number;
    totalAnnual: number;
  };
}

export function useExpensesAnalytics(year?: string) {
  const currentYear = year || new Date().getFullYear().toString();

  return useQuery<ExpensesAnalytics>({
    queryKey: ['expenses-analytics', currentYear],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/expenses/analytics?year=${currentYear}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch expenses analytics');
      }
      return response.json();
    },
  });
}

