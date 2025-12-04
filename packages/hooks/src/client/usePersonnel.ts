// React Query hooks for Personnel

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { personnelApi } from '@kit/lib';
import type { Personnel, PersonnelProjection, CreatePersonnelData, UpdatePersonnelData } from '@kit/types';

export function usePersonnel(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['personnel', params],
    queryFn: async () => {
      try {
        const result = await personnelApi.getAll(params);
        // Return full paginated response
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        // If result is already an array (fallback for backward compatibility)
        if (Array.isArray(result)) {
          return {
            data: result,
            pagination: {
              page: 1,
              limit: result.length,
              total: result.length,
              totalPages: 1,
              hasMore: false,
            },
          };
        }
        console.warn('[usePersonnel] Unexpected response format:', result);
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      } catch (error) {
        console.error('[usePersonnel] Error fetching personnel:', error);
        throw error;
      }
    },
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

export function usePersonnelSalaryProjections(personnelId: string, startMonth?: string, endMonth?: string) {
  return useQuery({
    queryKey: ['personnel', personnelId, 'salary-projections', startMonth, endMonth],
    queryFn: () => personnelApi.getSalaryProjections(personnelId, startMonth, endMonth),
    enabled: !!personnelId,
  });
}

export function useCreateOrUpdatePersonnelSalaryProjectionEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ personnelId, data }: { 
      personnelId: string; 
      data: import('@kit/types').CreatePersonnelSalaryProjectionData 
    }) => 
      personnelApi.createOrUpdateSalaryProjectionEntry(personnelId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personnel', variables.personnelId, 'salary-projections'] });
      queryClient.invalidateQueries({ queryKey: ['personnel', variables.personnelId] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

export function useUpdatePersonnelSalaryProjectionEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ personnelId, entryId, data }: { 
      personnelId: string; 
      entryId: string; 
      data: import('@kit/types').UpdatePersonnelSalaryProjectionData 
    }) => 
      personnelApi.updateSalaryProjectionEntry(personnelId, entryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personnel', variables.personnelId, 'salary-projections'] });
      queryClient.invalidateQueries({ queryKey: ['personnel', variables.personnelId] });
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

