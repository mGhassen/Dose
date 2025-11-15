// React Query hook for Leasing Analytics

import { useQuery } from '@tanstack/react-query';

export interface LeasingAnalytics {
  typeBreakdown: Array<{ type: string; count: number; annualCost: number; percentage: number }>;
  monthlyTrend: Array<{ month: string; total: number; [key: string]: number | string }>;
  topLeases: Array<{ id: number; name: string; type: string; monthlyAmount: number; annualCost: number }>;
  summary: {
    totalLeases: number;
    totalMonthly: number;
    totalAnnual: number;
    avgMonthly: number;
  };
}

export function useLeasingAnalytics(year?: string) {
  const currentYear = year || new Date().getFullYear().toString();

  return useQuery<LeasingAnalytics>({
    queryKey: ['leasing-analytics', currentYear],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/leasing/analytics?year=${currentYear}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch leasing analytics');
      }
      return response.json();
    },
  });
}

