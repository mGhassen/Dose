// React Query hooks for Profit & Loss

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profitLossApi } from '@kit/lib';
import type { ProfitAndLoss, CreateProfitAndLossData, UpdateProfitAndLossData } from '@kit/types';

export function useProfitLoss() {
  return useQuery({
    queryKey: ['profit-loss'],
    queryFn: async () => {
      console.log('[useProfitLoss] Calling profitLossApi.getAll...');
      try {
        const result = await profitLossApi.getAll();
        console.log('[useProfitLoss] API call successful, got', result?.length || 0, 'items');
        console.log('[useProfitLoss] Result type:', typeof result);
        console.log('[useProfitLoss] Result is array?', Array.isArray(result));
        console.log('[useProfitLoss] First item:', result?.[0]);
        // Ensure we return an array even if result is undefined
        const data = result || [];
        console.log('[useProfitLoss] Returning data, length:', data.length);
        return data;
      } catch (error) {
        console.error('[useProfitLoss] API call failed:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
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

