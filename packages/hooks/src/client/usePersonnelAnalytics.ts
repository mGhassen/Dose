// React Query hook for Personnel Analytics

import { useQuery } from '@tanstack/react-query';

export interface PersonnelAnalytics {
  typeBreakdown: Array<{ type: string; count: number; monthlyCost: number; percentage: number }>;
  positionBreakdown: Array<{ position: string; count: number; monthlyCost: number; percentage: number }>;
  monthlyTrend: Array<{ month: string; cost: number; headcount: number; [key: string]: number | string }>;
  topPositions: Array<{ position: string; count: number; monthlyCost: number; annualCost: number }>;
  summary: {
    totalPersonnel: number;
    totalMonthlyCost: number;
    totalAnnualCost: number;
    averageSalary: number;
    averageHeadcount: number;
  };
}

export function usePersonnelAnalytics(year?: string) {
  const currentYear = year || new Date().getFullYear().toString();

  return useQuery<PersonnelAnalytics>({
    queryKey: ['personnel-analytics', currentYear],
    queryFn: async () => {
      const response = await fetch(`/api/personnel/analytics?year=${currentYear}`);
      if (!response.ok) {
        throw new Error('Failed to fetch personnel analytics');
      }
      return response.json();
    },
  });
}

