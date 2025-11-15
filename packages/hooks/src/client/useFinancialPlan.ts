// React Query hooks for Financial Plan

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialPlanApi } from '@kit/lib';
import type { FinancialPlan, CreateFinancialPlanData, UpdateFinancialPlanData } from '@kit/types';

export function useFinancialPlan() {
  return useQuery({
    queryKey: ['financial-plan'],
    queryFn: async ({ signal }) => {
      const result = await financialPlanApi.getAll(signal);
      return result || [];
    },
    retry: 1,
    retryDelay: 1000,
  });
}

export function useFinancialPlanById(id: string) {
  return useQuery({
    queryKey: ['financial-plan', id],
    queryFn: ({ signal }) => financialPlanApi.getById(id, signal),
    enabled: !!id,
  });
}

export function useFinancialPlanByMonth(month: string) {
  return useQuery({
    queryKey: ['financial-plan', 'month', month],
    queryFn: ({ signal }) => financialPlanApi.getByMonth(month, signal),
    enabled: !!month,
  });
}

export function useCreateFinancialPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: financialPlanApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-plan'] });
    },
  });
}

export function useUpdateFinancialPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFinancialPlanData }) => 
      financialPlanApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['financial-plan'] });
      queryClient.invalidateQueries({ queryKey: ['financial-plan', variables.id] });
    },
  });
}

export function useDeleteFinancialPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: financialPlanApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-plan'] });
    },
  });
}

export function useCalculateFinancialPlan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (month: string) => financialPlanApi.calculate(month),
    onSuccess: (_, month) => {
      queryClient.invalidateQueries({ queryKey: ['financial-plan'] });
      queryClient.invalidateQueries({ queryKey: ['financial-plan', 'month', month] });
    },
  });
}

