// React Query hooks for Leasing Payments

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leasingApi } from '@kit/lib';
import type { LeasingPayment, CreateLeasingPaymentData, UpdateLeasingPaymentData } from '@kit/types';

export function useLeasing() {
  return useQuery({
    queryKey: ['leasing'],
    queryFn: leasingApi.getAll,
  });
}

export function useLeasingById(id: string) {
  return useQuery({
    queryKey: ['leasing', id],
    queryFn: () => leasingApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateLeasing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: leasingApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leasing'] });
    },
  });
}

export function useUpdateLeasing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeasingPaymentData }) => 
      leasingApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leasing'] });
      queryClient.invalidateQueries({ queryKey: ['leasing', variables.id] });
    },
  });
}

export function useDeleteLeasing() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: leasingApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leasing'] });
    },
  });
}

