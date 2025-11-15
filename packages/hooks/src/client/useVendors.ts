// React Query hooks for Vendors

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorsApi } from '@kit/lib';
import type { Vendor, CreateVendorData, UpdateVendorData } from '@kit/types';

export function useVendors(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['vendors', params],
    queryFn: async () => {
      try {
        const result = await vendorsApi.getAll(params);
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
        console.warn('[useVendors] Unexpected response format:', result);
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
        console.error('[useVendors] Error fetching vendors:', error);
        throw error;
      }
    },
  });
}

export function useVendorById(id: string) {
  return useQuery({
    queryKey: ['vendors', id],
    queryFn: () => vendorsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vendorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorData }) => 
      vendorsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendors', variables.id] });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vendorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

