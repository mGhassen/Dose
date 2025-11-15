// React Query hook for Investments Analytics

import { useQuery } from '@tanstack/react-query';

export interface InvestmentsAnalytics {
  typeBreakdown: Array<{ 
    type: string; 
    count: number; 
    totalAmount: number; 
    totalBookValue: number;
    totalDepreciation: number;
    percentage: number;
  }>;
  monthlyDepreciation: Array<{ month: string; total: number; [key: string]: number | string }>;
  assetValueOverTime: Array<{ 
    month: string; 
    purchaseValue: number; 
    bookValue: number; 
    depreciation: number;
  }>;
  methodBreakdown: Array<{ method: string; count: number; totalAmount: number; percentage: number }>;
  topInvestments: Array<{ 
    id: number; 
    name: string; 
    type: string; 
    purchaseValue: number; 
    bookValue: number; 
    depreciation: number;
  }>;
  summary: {
    totalInvestments: number;
    totalPurchaseValue: number;
    totalDepreciation: number;
    totalAccumulatedDepreciation: number;
    totalBookValue: number;
    avgInvestmentValue: number;
    depreciationRate: number;
  };
}

export function useInvestmentsAnalytics() {
  return useQuery<InvestmentsAnalytics>({
    queryKey: ['investments-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/investments/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch investments analytics');
      }
      return response.json();
    },
  });
}

