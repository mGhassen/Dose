import { useQuery } from '@tanstack/react-query';

export type MenuClassification = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface ProductAnalyticsRow {
  itemId: number;
  name: string;
  category: string;
  units: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
  marginContribution: number;
  avgPrice: number;
  unitsPerDay: number;
}

export interface ProductAnalyticsMenuRow extends ProductAnalyticsRow {
  classification: MenuClassification;
}

export interface ProductAnalytics {
  products: ProductAnalyticsRow[];
  menuMatrix: ProductAnalyticsMenuRow[];
  categoryMix: Array<{ category: string; revenue: number; units: number; pct: number }>;
  attachRate: Array<{
    itemAId: number;
    itemBId: number;
    itemAName: string;
    itemBName: string;
    pairCount: number;
    aSales: number;
    bSales: number;
    confidenceAtoB: number;
    confidenceBtoA: number;
    lift: number;
  }>;
  hotIcedSplit: Array<{
    itemId: number;
    name: string;
    hotUnits: number;
    coldUnits: number;
    neutralUnits: number;
    hotRevenue: number;
    coldRevenue: number;
  }>;
  modifierRevenue: {
    items: Array<{ itemId: number; name: string; units: number; revenue: number }>;
    totalModifierRevenue: number;
    modifierShareOfBaseRevenue: number;
  };
  deadStock: Array<{
    itemId: number;
    name: string;
    category: string;
    daysSinceLastSale: number | null;
    lifetimeUnits: number;
  }>;
  daypart: {
    buckets: Array<{
      bucket: string;
      startHour: number;
      endHour: number;
      revenue: number;
      units: number;
      topItems: Array<{ itemId: number; name: string; revenue: number }>;
    }>;
    hasTimeData: boolean;
  };
  summary: {
    totalRevenue: number;
    totalUnits: number;
    totalCOGS: number;
    totalMargin: number;
    avgMarginPct: number;
    uniqueProductsSold: number;
    periodDays: number;
    medians: { units: number; marginPct: number };
  };
}

export interface UseProductAnalyticsParams {
  startDate?: string;
  endDate?: string;
  topN?: number;
  deadStockWindowDays?: number;
}

export function useProductAnalytics(params: UseProductAnalyticsParams = {}) {
  const { startDate, endDate, topN, deadStockWindowDays } = params;

  return useQuery<ProductAnalytics>({
    queryKey: ['product-analytics', startDate, endDate, topN, deadStockWindowDays],
    queryFn: async ({ signal }) => {
      const search = new URLSearchParams();
      if (startDate) search.set('startDate', startDate);
      if (endDate) search.set('endDate', endDate);
      if (topN != null) search.set('topN', String(topN));
      if (deadStockWindowDays != null) search.set('deadStockWindowDays', String(deadStockWindowDays));
      const response = await fetch(`/api/sales/analytics/products?${search.toString()}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch product analytics');
      }
      return response.json();
    },
    enabled: Boolean(startDate && endDate),
  });
}
