// React Query hooks for Actual Payments

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { actualPaymentsApi, type CreateActualPaymentData, type UpdateActualPaymentData } from '@kit/lib';
import type { ActualPayment } from '@kit/lib';

export function useActualPayments(params?: { paymentType?: string; direction?: 'input' | 'output'; referenceId?: string; scheduleEntryId?: string; month?: string }) {
  return useQuery({
    queryKey: ['actual-payments', params],
    queryFn: () => actualPaymentsApi.getAll(params),
  });
}

export function useCreateActualPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: actualPaymentsApi.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['actual-payments'] });
      // If this is a subscription payment, also invalidate expenses since an expense was created
      if (data.paymentType === 'subscription') {
        queryClient.invalidateQueries({ queryKey: ['expenses'] });
      }
    },
  });
}

export function useUpdateActualPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActualPaymentData }) => 
      actualPaymentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actual-payments'] });
    },
  });
}

export function useDeleteActualPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: actualPaymentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actual-payments'] });
      // Also invalidate expenses in case a subscription payment was deleted (which deletes an expense)
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

