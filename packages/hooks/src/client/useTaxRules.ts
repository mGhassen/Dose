import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxRulesApi } from '@kit/lib';
import type { CreateTaxRuleData, UpdateTaxRuleData } from '@kit/types';

export function useTaxRules(params?: { variableId?: number }) {
  return useQuery({
    queryKey: ['tax-rules', params],
    queryFn: () => taxRulesApi.getAll(params),
  });
}

export function useTaxRuleById(id: string) {
  return useQuery({
    queryKey: ['tax-rules', id],
    queryFn: () => taxRulesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateTaxRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaxRuleData) => taxRulesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    },
  });
}

export function useUpdateTaxRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaxRuleData }) => taxRulesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      queryClient.invalidateQueries({ queryKey: ['tax-rules', id] });
    },
  });
}

export function useDeleteTaxRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxRulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
    },
  });
}

export function useResolveTaxRate() {
  return useMutation({
    mutationFn: (params: Parameters<typeof taxRulesApi.resolve>[0]) => taxRulesApi.resolve(params),
  });
}
