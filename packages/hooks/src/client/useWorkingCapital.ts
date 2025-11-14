// React Query hooks for Working Capital

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workingCapitalApi } from '@kit/lib';
import type { WorkingCapital, CreateWorkingCapitalData, UpdateWorkingCapitalData } from '@kit/types';

export function useWorkingCapital() {
  return useQuery({
    queryKey: ['working-capital'],
    queryFn: workingCapitalApi.getAll,
  });
}

export function useWorkingCapitalById(id: string) {
  return useQuery({
    queryKey: ['working-capital', id],
    queryFn: () => workingCapitalApi.getById(id),
    enabled: !!id,
  });
}

export function useWorkingCapitalByMonth(month: string) {
  return useQuery({
    queryKey: ['working-capital', 'month', month],
    queryFn: () => workingCapitalApi.getByMonth(month),
    enabled: !!month,
  });
}

export function useCreateWorkingCapital() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workingCapitalApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-capital'] });
    },
  });
}

export function useUpdateWorkingCapital() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkingCapitalData }) => 
      workingCapitalApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['working-capital'] });
      queryClient.invalidateQueries({ queryKey: ['working-capital', variables.id] });
    },
  });
}

export function useDeleteWorkingCapital() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workingCapitalApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-capital'] });
    },
  });
}

export function useCalculateWorkingCapital() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (month: string) => workingCapitalApi.calculate(month),
    onSuccess: (_, month) => {
      queryClient.invalidateQueries({ queryKey: ['working-capital'] });
      queryClient.invalidateQueries({ queryKey: ['working-capital', 'month', month] });
    },
  });
}

