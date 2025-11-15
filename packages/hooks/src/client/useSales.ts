// React Query hooks for Sales

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@kit/lib';
import type { Sale, SalesSummary, CreateSaleData, UpdateSaleData } from '@kit/types';

export function useSales(params?: { page?: number; limit?: number; month?: string; type?: string }) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: async () => {
      try {
        const result = await salesApi.getAll(params);
        // Return full paginated response
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        // If result is already an array (fallback for backward compatibility)
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
        console.warn('[useSales] Unexpected response format:', result);
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
        console.error('[useSales] Error fetching sales:', error);
        throw error;
      }
    },
  });
}

export function useSaleById(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => salesApi.getById(id),
    enabled: !!id,
  });
}

export function useSalesByMonth(month: string) {
  return useQuery({
    queryKey: ['sales', 'month', month],
    queryFn: async () => {
      const result = await salesApi.getByMonth(month);
      // Extract data from paginated response
      return result?.data || [];
    },
    enabled: !!month,
  });
}

export function useSalesByType(type: string) {
  return useQuery({
    queryKey: ['sales', 'type', type],
    queryFn: async () => {
      const result = await salesApi.getByType(type);
      // Extract data from paginated response
      return result?.data || [];
    },
    enabled: !!type,
  });
}

export function useSalesSummary(startMonth: string, endMonth: string) {
  return useQuery({
    queryKey: ['sales', 'summary', startMonth, endMonth],
    queryFn: () => salesApi.getSummary(startMonth, endMonth),
    enabled: !!startMonth && !!endMonth,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSaleData }) => 
      salesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', variables.id] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

