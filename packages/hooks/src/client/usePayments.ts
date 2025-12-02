// React Query hooks for Payments

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, type CreatePaymentData, type UpdatePaymentData } from '@kit/lib';
import type { Payment } from '@kit/lib';

export function usePayments(params?: { 
  page?: number; 
  limit?: number; 
  entryId?: string; 
  isPaid?: boolean; 
  month?: string;
}) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      try {
        const result = await paymentsApi.getAll(params);
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
        console.warn('[usePayments] Unexpected response format:', result);
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
        console.error('[usePayments] Error fetching payments:', error);
        throw error;
      }
    },
  });
}

export function usePaymentById(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.getById(id),
    enabled: !!id,
  });
}

export function usePaymentsByEntry(entryId: string) {
  return useQuery({
    queryKey: ['payments', 'entry', entryId],
    queryFn: async () => {
      const result = await paymentsApi.getAll({ entryId });
      return result?.data || [];
    },
    enabled: !!entryId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries', data.entryId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePaymentData }) => 
      paymentsApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments', variables.id] });
      if (data.entryId) {
        queryClient.invalidateQueries({ queryKey: ['entries', data.entryId.toString()] });
      }
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

