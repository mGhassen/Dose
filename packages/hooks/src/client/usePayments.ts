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
          const arr = result as import('@kit/lib').Payment[];
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries', data.entryId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });

      // Also invalidate related schedules when this payment is linked to a schedule entry
      // We reuse the same entry lookup for both loan and subscription schedules.
      try {
        const entriesApi = await import('@kit/lib');
        const entry = await entriesApi.entriesApi.getById(data.entryId.toString());

        if (entry && entry.referenceId) {
          if (entry.entryType === 'loan_payment') {
            queryClient.invalidateQueries({ queryKey: ['loans', entry.referenceId.toString(), 'schedule'] });
            queryClient.invalidateQueries({ queryKey: ['loans', 'schedules'] });
          }

          if (entry.entryType === 'subscription_payment') {
            const subscriptionId = entry.referenceId.toString();
            queryClient.invalidateQueries({ queryKey: ['subscriptions', subscriptionId, 'projections'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions', subscriptionId] });
          }
        }
      } catch (error) {
        // Ignore errors when fetching entry for invalidation
      }
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
    mutationFn: async (id: string) => {
      // Fetch payment before deleting to get entryId for invalidation
      const payment = await paymentsApi.getById(id);
      await paymentsApi.delete(id);
      return payment;
    },
    onSuccess: async (payment) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });

      // Also invalidate related schedules when this payment is linked to a schedule entry
      if (payment?.entryId) {
        try {
          const entriesApi = await import('@kit/lib');
          const entry = await entriesApi.entriesApi.getById(payment.entryId.toString());
          if (entry && entry.referenceId) {
            if (entry.entryType === 'loan_payment') {
              queryClient.invalidateQueries({ queryKey: ['loans', entry.referenceId.toString(), 'schedule'] });
              queryClient.invalidateQueries({ queryKey: ['loans', 'schedules'] });
            }

            if (entry.entryType === 'subscription_payment') {
              const subscriptionId = entry.referenceId.toString();
              queryClient.invalidateQueries({ queryKey: ['subscriptions', subscriptionId, 'projections'] });
              queryClient.invalidateQueries({ queryKey: ['subscriptions', subscriptionId] });
            }
          }
        } catch (error) {
          // Ignore errors when fetching entry for invalidation
        }
      }
    },
  });
}

