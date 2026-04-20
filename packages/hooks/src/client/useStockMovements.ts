// React Query hooks for Stock Movements

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockMovementsApi } from '@kit/lib';
import type { StockMovement, CreateStockMovementData, UpdateStockMovementData } from '@kit/types';

export function useStockMovements(params?: { page?: number; limit?: number; itemId?: string; ingredientId?: string; movementType?: string; startDate?: string; endDate?: string; location?: string }) {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: async () => {
      try {
        const result = await stockMovementsApi.getAll(params);
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        if (Array.isArray(result)) {
          const arr = result as import('@kit/types').StockMovement[];
          return {
            data: arr,
            pagination: {
              page: 1,
              limit: arr.length,
              total: arr.length,
              totalPages: 1,
              hasMore: false,
            },
          };
        }
        console.warn('[useStockMovements] Unexpected response format:', result);
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      } catch (error) {
        console.error('[useStockMovements] Error fetching stock movements:', error);
        throw error;
      }
    },
  });
}

export type StockMovementsAnalyticsResponse = {
  totals: {
    total_count: number;
    total_in_qty: number;
    total_out_qty: number;
    total_waste_qty: number;
    total_expired_qty: number;
    total_adj_qty: number;
    count_in: number;
    count_out: number;
    count_waste: number;
    count_expired: number;
    net: number;
  } | null;
  daily: Array<{
    date: string;
    qty_in: number;
    qty_out: number;
    qty_waste: number;
    qty_expired: number;
    qty_adj: number;
    count: number;
    net: number;
  }>;
  by_type: Array<{ type: string; count: number; qty: number }>;
  by_category: Array<{ name: string; qty_in: number; qty_out: number; net: number; count: number }>;
  by_location: Array<{ name: string; value: number }>;
  by_reference: Array<{ name: string; value: number }>;
  top_items: Array<{
    item_id: number;
    name: string;
    unit: string;
    qty_in: number;
    qty_out: number;
    net: number;
    count: number;
  }>;
  weekday: Array<{ dow: number; count: number; qty: number }>;
};

export function useStockMovementsAnalytics(
  params?: {
    itemId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? params != null;
  return useQuery({
    queryKey: ['stock-movements-analytics', params],
    queryFn: () => stockMovementsApi.getAnalytics(params) as Promise<StockMovementsAnalyticsResponse>,
    enabled,
  });
}

export function useStockMovementById(id: string) {
  return useQuery({
    queryKey: ['stock-movements', id],
    queryFn: () => stockMovementsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: stockMovementsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

export function useUpdateStockMovement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStockMovementData }) => 
      stockMovementsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

export function useDeleteStockMovement() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: stockMovementsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

