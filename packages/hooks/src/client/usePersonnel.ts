// React Query hooks for Personnel

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personnelApi } from '@kit/lib';
import type { Personnel, PersonnelProjection, CreatePersonnelData, UpdatePersonnelData } from '@kit/types';

export function usePersonnel() {
  return useQuery({
    queryKey: ['personnel'],
    queryFn: personnelApi.getAll,
  });
}

export function usePersonnelById(id: string) {
  return useQuery({
    queryKey: ['personnel', id],
    queryFn: () => personnelApi.getById(id),
    enabled: !!id,
  });
}

export function usePersonnelProjections(startMonth: string, endMonth: string) {
  return useQuery({
    queryKey: ['personnel', 'projections', startMonth, endMonth],
    queryFn: () => personnelApi.getProjections(startMonth, endMonth),
    enabled: !!startMonth && !!endMonth,
  });
}

export function usePersonnelTotalCost(month: string) {
  return useQuery({
    queryKey: ['personnel', 'total-cost', month],
    queryFn: () => personnelApi.getTotalCost(month),
    enabled: !!month,
  });
}

export function useCreatePersonnel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: personnelApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    },
  });
}

export function useUpdatePersonnel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePersonnelData }) => 
      personnelApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
      queryClient.invalidateQueries({ queryKey: ['personnel', variables.id] });
    },
  });
}

export function useDeletePersonnel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: personnelApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnel'] });
    },
  });
}

