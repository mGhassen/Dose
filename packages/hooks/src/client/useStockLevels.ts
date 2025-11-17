// React Query hooks for Stock Levels

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockLevelsApi } from '@kit/lib';
import type { StockLevel, CreateStockLevelData, UpdateStockLevelData } from '@kit/types';

export function useStockLevels(params?: { page?: number; limit?: number; ingredientId?: string; location?: string }) {
  return useQuery({
    queryKey: ['stock-levels', params],
    queryFn: async () => {
      try {
        const result = await stockLevelsApi.getAll(params);
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
        console.warn('[useStockLevels] Unexpected response format:', result);
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
        console.error('[useStockLevels] Error fetching stock levels:', error);
        throw error;
      }
    },
  });
}

export function useStockLevelById(id: string) {
  return useQuery({
    queryKey: ['stock-levels', id],
    queryFn: () => stockLevelsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateStockLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: stockLevelsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

export function useUpdateStockLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStockLevelData }) => 
      stockLevelsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels', variables.id] });
    },
  });
}

export function useDeleteStockLevel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: stockLevelsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
    },
  });
}

