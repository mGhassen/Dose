// React Query hooks for Variables

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { variablesApi } from '@kit/lib';
import type { Variable, CreateVariableData, UpdateVariableData } from '@kit/types';

export function useVariables() {
  return useQuery({
    queryKey: ['variables'],
    queryFn: variablesApi.getAll,
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
    queryFn: () => variablesApi.getByType(type),
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['variables'] });
      queryClient.invalidateQueries({ queryKey: ['variables', variables.id] });
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

