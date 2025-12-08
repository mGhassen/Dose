// React Query hooks for Inventory Suppliers

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventorySuppliersApi } from '@kit/lib';
import type { Supplier, CreateSupplierData, UpdateSupplierData } from '@kit/types';

export function useInventorySuppliers(params?: { page?: number; limit?: number; supplierType?: 'supplier' | 'vendor' }) {
  return useQuery({
    queryKey: ['inventory-suppliers', params],
    queryFn: async () => {
      try {
        const result = await inventorySuppliersApi.getAll(params);
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
        console.warn('[useInventorySuppliers] Unexpected response format:', result);
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
        console.error('[useInventorySuppliers] Error fetching suppliers:', error);
        throw error;
      }
    },
  });
}

export function useInventorySupplierById(id: string) {
  return useQuery({
    queryKey: ['inventory-suppliers', id],
    queryFn: () => inventorySuppliersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateInventorySupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: inventorySuppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
    },
  });
}

export function useUpdateInventorySupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierData }) => 
      inventorySuppliersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers', variables.id] });
    },
  });
}

export function useDeleteInventorySupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: inventorySuppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-suppliers'] });
    },
  });
}

