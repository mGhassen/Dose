// React Query hooks for Entries

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entriesApi, type CreateEntryData, type UpdateEntryData } from '@kit/lib';
import type { Entry } from '@kit/lib';

export function useEntries(params?: { 
  page?: number; 
  limit?: number; 
  direction?: 'input' | 'output'; 
  entryType?: string; 
  category?: string; 
  month?: string;
  includePayments?: boolean;
  referenceId?: number;
  scheduleEntryId?: number;
}) {
  return useQuery({
    queryKey: ['entries', params],
    queryFn: async () => {
      try {
        const result = await entriesApi.getAll(params);
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
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
        console.warn('[useEntries] Unexpected response format:', result);
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
        console.error('[useEntries] Error fetching entries:', error);
        throw error;
      }
    },
  });
}

export function useEntryById(id: string, includePayments: boolean = true) {
  return useQuery({
    queryKey: ['entries', id, includePayments],
    queryFn: () => entriesApi.getById(id, includePayments),
    enabled: !!id,
  });
}

export function useCreateEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: entriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntryData }) => 
      entriesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['entries', variables.id] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: entriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
    },
  });
}

