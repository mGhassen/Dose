// React Query hooks for Variables

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { variablesApi } from '@kit/lib';
import type { Variable, CreateVariableData, UpdateVariableData } from '@kit/types';

export function useVariables() {
  return useQuery({
    queryKey: ['variables'],
    queryFn: async () => {
      const result = await variablesApi.getAll();
      // Extract data from paginated response
      return result?.data || [];
    },
  });
}

export function useVariableById(id: string) {
  return useQuery({
    queryKey: ['variables', id],
    queryFn: () => variablesApi.getById(id),
    enabled: !!id,
  });
}

export function useVariablesByType(type: string) {
  return useQuery({
    queryKey: ['variables', 'type', type],
    queryFn: async () => {
      const result = await variablesApi.getByType(type);
      // Extract data from paginated response
      return result?.data || [];
    },
    enabled: !!type,
  });
}

export function useCreateVariable() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: variablesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables'] });
    },
  });
}

export function useUpdateVariable() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVariableData }) => 
      variablesApi.update(id, data),
    onSuccess: async (updatedVariable, variables) => {
      // Refetch the specific variable to ensure it's updated
      await queryClient.refetchQueries({ queryKey: ['variables', variables.id] });
      
      // Invalidate all variables queries
      queryClient.invalidateQueries({ queryKey: ['variables'] });
      queryClient.invalidateQueries({ queryKey: ['variables', 'type'] });
      
      // Invalidate calculations that depend on variables
      // Personnel calculations use Social Security Rate and Employee Social Tax Rate
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      queryClient.invalidateQueries({ queryKey: ['personnel', 'projections'] });
      queryClient.invalidateQueries({ queryKey: ['personnel', 'salary-projections'] });
      
      // Financial calculations that use variables
      queryClient.invalidateQueries({ queryKey: ['profit-loss'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['financial-statements'] });
    },
  });
}

export function useDeleteVariable() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: variablesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['variables'] });
    },
  });
}

