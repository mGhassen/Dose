// React Query hooks for Expiry Dates

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expiryDatesApi } from '@kit/lib';
import type { ExpiryDate, CreateExpiryDateData, UpdateExpiryDateData } from '@kit/types';

export function useExpiryDates(params?: { page?: number; limit?: number; ingredientId?: string; isExpired?: boolean }) {
  return useQuery({
    queryKey: ['expiry-dates', params],
    queryFn: async () => {
      try {
        const result = await expiryDatesApi.getAll(params);
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
        console.warn('[useExpiryDates] Unexpected response format:', result);
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
        console.error('[useExpiryDates] Error fetching expiry dates:', error);
        throw error;
      }
    },
  });
}

export function useExpiryDateById(id: string) {
  return useQuery({
    queryKey: ['expiry-dates', id],
    queryFn: () => expiryDatesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateExpiryDate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: expiryDatesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiry-dates'] });
    },
  });
}

export function useUpdateExpiryDate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpiryDateData }) => 
      expiryDatesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expiry-dates'] });
      queryClient.invalidateQueries({ queryKey: ['expiry-dates', variables.id] });
    },
  });
}

export function useDeleteExpiryDate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: expiryDatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expiry-dates'] });
    },
  });
}

