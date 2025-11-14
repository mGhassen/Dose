// React Query hooks for Profit & Loss

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profitLossApi } from '@kit/lib';
import type { ProfitAndLoss, CreateProfitAndLossData, UpdateProfitAndLossData } from '@kit/types';

export function useProfitLoss() {
  return useQuery({
    queryKey: ['profit-loss'],
    queryFn: profitLossApi.getAll,
  });
}

export function useProfitLossById(id: string) {
  return useQuery({
    queryKey: ['profit-loss', id],
    queryFn: () => profitLossApi.getById(id),
    enabled: !!id,
  });
}

export function useProfitLossByMonth(month: string) {
  return useQuery<ProfitAndLoss | null>({
    queryKey: ['profit-loss', 'month', month],
    queryFn: () => profitLossApi.getByMonth(month),
    enabled: !!month,
  });
}

export function useCreateProfitLoss() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: profitLossApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
    },
  });
}

export function useUpdateProfitLoss() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfitAndLossData }) => 
      profitLossApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
      queryClient.invalidateQueries({ queryKey: ['profit-loss', variables.id] });
    },
  });
}

export function useDeleteProfitLoss() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: profitLossApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
    },
  });
}

export function useCalculateProfitLoss() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (month: string) => profitLossApi.calculate(month),
    onSuccess: (_, month) => {
      queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
      queryClient.invalidateQueries({ queryKey: ['profit-loss', 'month', month] });
    },
  });
}

