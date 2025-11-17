// React Query hooks for Stock Movements

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockMovementsApi } from '@kit/lib';
import type { StockMovement, CreateStockMovementData, UpdateStockMovementData } from '@kit/types';

export function useStockMovements(params?: { page?: number; limit?: number; ingredientId?: string; movementType?: string }) {
  return useQuery({
    queryKey: ['stock-movements', params],
    queryFn: async () => {
      try {
        const result = await stockMovementsApi.getAll(params);
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        if (Array.isArray(result)) {
          return {
            data: result,
            pagination: {
              page: 1,
              limit: result.length,
              total: result.length,
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
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

