// React Query hooks for Supplier Orders

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierOrdersApi } from '@kit/lib';
import type { SupplierOrder, CreateSupplierOrderData, UpdateSupplierOrderData } from '@kit/types';

export function useSupplierOrders(params?: { page?: number; limit?: number; supplierId?: string; status?: string }) {
  return useQuery({
    queryKey: ['supplier-orders', params],
    queryFn: async () => {
      try {
        const result = await supplierOrdersApi.getAll(params);
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
        console.warn('[useSupplierOrders] Unexpected response format:', result);
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
        console.error('[useSupplierOrders] Error fetching supplier orders:', error);
        throw error;
      }
    },
  });
}

export function useSupplierOrderById(id: string) {
  return useQuery({
    queryKey: ['supplier-orders', id],
    queryFn: () => supplierOrdersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateSupplierOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: supplierOrdersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
    },
  });
}

export function useUpdateSupplierOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSupplierOrderData }) => 
      supplierOrdersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-orders', variables.id] });
    },
  });
}

export function useDeleteSupplierOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: supplierOrdersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
    },
  });
}

export function useReceiveSupplierOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { actualDeliveryDate?: string; items: Array<{ itemId: number; receivedQuantity: number; location?: string }> } }) => 
      supplierOrdersApi.receive(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

