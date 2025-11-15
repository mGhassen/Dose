// React Query hooks for Cash Flow

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashFlowApi } from '@kit/lib';
import type { CashFlowEntry, CreateCashFlowEntryData, UpdateCashFlowEntryData } from '@kit/types';

export function useCashFlow() {
  return useQuery({
    queryKey: ['cash-flow'],
    queryFn: async () => {
      const result = await cashFlowApi.getAll();
      // Ensure we return an array even if result is undefined
      return result || [];
    },
    retry: 1,
    retryDelay: 1000,
  });
}

export function useCashFlowById(id: string) {
  return useQuery({
    queryKey: ['cash-flow', id],
    queryFn: () => cashFlowApi.getById(id),
    enabled: !!id,
  });
}

export function useCashFlowByMonth(month: string) {
  return useQuery({
    queryKey: ['cash-flow', 'month', month],
    queryFn: () => cashFlowApi.getByMonth(month),
    enabled: !!month,
  });
}

export function useCashFlowProjection(startMonth: string, endMonth: string) {
  return useQuery({
    queryKey: ['cash-flow', 'projection', startMonth, endMonth],
    queryFn: () => cashFlowApi.getProjection(startMonth, endMonth),
    enabled: !!startMonth && !!endMonth,
  });
}

export function useCreateCashFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cashFlowApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    },
  });
}

export function useUpdateCashFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCashFlowEntryData }) => 
      cashFlowApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow', variables.id] });
    },
  });
}

export function useDeleteCashFlow() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cashFlowApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    },
  });
}

