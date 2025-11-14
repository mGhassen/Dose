// React Query hooks for Budget Projections

import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export interface BudgetProjection {
  id: number;
  projection_type: 'expense' | 'personnel' | 'leasing' | 'sales';
  reference_id: number | null;
  month: string; // YYYY-MM
  amount: number;
  category: string | null;
  is_projected: boolean;
  created_at: string;
  updated_at: string;
}

interface UseBudgetProjectionsOptions {
  projectionType?: string;
  referenceId?: number;
  startMonth?: string;
  endMonth?: string;
  enabled?: boolean;
}

export function useBudgetProjections(options?: UseBudgetProjectionsOptions & Omit<UseQueryOptions<BudgetProjection[]>, 'queryKey' | 'queryFn'>) {
  const { projectionType, referenceId, startMonth, endMonth, enabled = true, ...queryOptions } = options || {};

  return useQuery({
    queryKey: ['budget-projections', projectionType, referenceId, startMonth, endMonth],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (projectionType) params.append('type', projectionType);
      if (referenceId) params.append('referenceId', referenceId.toString());
      if (startMonth) params.append('startMonth', startMonth);
      if (endMonth) params.append('endMonth', endMonth);

      const response = await fetch(`/api/budget-projections?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget projections');
      }
      return response.json() as Promise<BudgetProjection[]>;
    },
    enabled,
    ...queryOptions,
  });
}

