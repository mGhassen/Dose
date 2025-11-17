// React Query hooks for Supplier Catalogs

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierCatalogsApi } from '@kit/lib';
import type { SupplierCatalog, CreateSupplierCatalogData, UpdateSupplierCatalogData } from '@kit/types';

export function useSupplierCatalogs(params?: { page?: number; limit?: number; supplierId?: string; ingredientId?: string }) {
  return useQuery({
    queryKey: ['supplier-catalogs', params],
    queryFn: async () => {
      try {
        const result = await supplierCatalogsApi.getAll(params);
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
        console.warn('[useSupplierCatalogs] Unexpected response format:', result);
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
        console.error('[useSupplierCatalogs] Error fetching supplier catalogs:', error);
        throw error;
      }
    },
  });
}

export function useSupplierCatalogById(id: string) {
  return useQuery({
    queryKey: ['supplier-catalogs', id],
    queryFn: () => supplierCatalogsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSupplierCatalog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: supplierCatalogsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-catalogs'] });
    },
  });
}

export function useUpdateSupplierCatalog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierCatalogData }) => 
      supplierCatalogsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-catalogs'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-catalogs', variables.id] });
    },
  });
}

export function useDeleteSupplierCatalog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: supplierCatalogsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-catalogs'] });
    },
  });
}

