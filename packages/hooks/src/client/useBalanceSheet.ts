// React Query hooks for Balance Sheet

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { balanceSheetApi } from '@kit/lib';
import type { BalanceSheet, CreateBalanceSheetData, UpdateBalanceSheetData } from '@kit/types';

export function useBalanceSheet() {
  return useQuery({
    queryKey: ['balance-sheet'],
    queryFn: async () => {
      const result = await balanceSheetApi.getAll();
      return result || [];
    },
    retry: 1,
    retryDelay: 1000,
  });
}

export function useBalanceSheetById(id: string) {
  return useQuery({
    queryKey: ['balance-sheet', id],
    queryFn: () => balanceSheetApi.getById(id),
    enabled: !!id,
  });
}

export function useBalanceSheetByMonth(month: string) {
  return useQuery<BalanceSheet | null>({
    queryKey: ['balance-sheet', 'month', month],
    queryFn: () => balanceSheetApi.getByMonth(month),
    enabled: !!month,
  });
}

export function useCreateBalanceSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: balanceSheetApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    },
  });
}

export function useUpdateBalanceSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBalanceSheetData }) => 
      balanceSheetApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet', variables.id] });
    },
  });
}

export function useDeleteBalanceSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: balanceSheetApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
    },
  });
}

export function useCalculateBalanceSheet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (month: string) => balanceSheetApi.calculate(month),
    onSuccess: (_, month) => {
      queryClient.invalidateQueries({ queryKey: ['balance-sheet'] });
      queryClient.invalidateQueries({ queryKey: ['balance-sheet', 'month', month] });
    },
  });
}

