// React Query hooks for Investments

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { investmentsApi, type UpdateDepreciationEntryData } from '@kit/lib';
import type { Investment, DepreciationEntry, CreateInvestmentData, UpdateInvestmentData } from '@kit/types';

export function useInvestments() {
  return useQuery({
    queryKey: ['investments'],
    queryFn: investmentsApi.getAll,
  });
}

export function useInvestmentById(id: string) {
  return useQuery({
    queryKey: ['investments', id],
    queryFn: () => investmentsApi.getById(id),
    enabled: !!id,
  });
}

export function useInvestmentDepreciation(investmentId: string) {
  return useQuery({
    queryKey: ['investments', investmentId, 'depreciation'],
    queryFn: () => investmentsApi.getDepreciation(investmentId),
    enabled: !!investmentId,
  });
}

export function useCreateInvestment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: investmentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useUpdateInvestment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInvestmentData }) => 
      investmentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
      queryClient.invalidateQueries({ queryKey: ['investments', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['investments', variables.id, 'depreciation'] });
    },
  });
}

export function useDeleteInvestment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: investmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investments'] });
    },
  });
}

export function useGenerateDepreciation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: investmentsApi.generateDepreciation,
    onSuccess: (_, investmentId) => {
      queryClient.invalidateQueries({ queryKey: ['investments', investmentId, 'depreciation'] });
    },
  });
}

export function useUpdateDepreciationEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ investmentId, entryId, data }: { investmentId: string; entryId: string; data: UpdateDepreciationEntryData }) => 
      investmentsApi.updateDepreciationEntry(investmentId, entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['investments', variables.investmentId, 'depreciation'] });
      queryClient.invalidateQueries({ queryKey: ['investments', variables.investmentId] });
    },
  });
}

