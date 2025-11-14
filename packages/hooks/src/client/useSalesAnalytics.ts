// React Query hook for Sales Analytics

import { useQuery } from '@tanstack/react-query';

export interface SalesAnalytics {
  typeBreakdown: Array<{ type: string; amount: number; percentage: number }>;
  monthlyTrend: Array<{ month: string; revenue: number; count: number; average: number; [key: string]: number | string }>;
  dailyTrend: Array<{ day: string; revenue: number }>;
  bestDays: Array<{ date: string; amount: number }>;
  summary: {
    totalRevenue: number;
    totalSales: number;
    totalQuantity: number;
    averageOrderValue: number;
    averageDailyRevenue: number;
  };
}

export function useSalesAnalytics(year?: string) {
  const currentYear = year || new Date().getFullYear().toString();

  return useQuery<SalesAnalytics>({
    queryKey: ['sales-analytics', currentYear],
    queryFn: async () => {
      const response = await fetch(`/api/sales/analytics?year=${currentYear}`);
      if (!response.ok) {
        throw new Error('Failed to fetch sales analytics');
      }
      return response.json();
    },
  });
}

