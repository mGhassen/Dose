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

export interface UseSalesAnalyticsParams {
  startDate?: string;
  endDate?: string;
}

export function useSalesAnalytics(params: UseSalesAnalyticsParams = {}) {
  const { startDate, endDate } = params;

  return useQuery<SalesAnalytics>({
    queryKey: ['sales-analytics', startDate, endDate],
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams();
      if (startDate) search.set('startDate', startDate);
      if (endDate) search.set('endDate', endDate);
      const response = await fetch(`/api/sales/analytics?${search.toString()}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch sales analytics');
      }
      return response.json();
    },
    enabled: Boolean(startDate && endDate),
  });
}
