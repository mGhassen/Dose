// React Query hooks for Sales

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '@kit/lib';
import type { Sale, SalesSummary, CreateSaleData, UpdateSaleData } from '@kit/types';

export function useSales() {
  return useQuery({
    queryKey: ['sales'],
    queryFn: salesApi.getAll,
  });
}

export function useSaleById(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => salesApi.getById(id),
    enabled: !!id,
  });
}

export function useSalesByMonth(month: string) {
  return useQuery({
    queryKey: ['sales', 'month', month],
    queryFn: () => salesApi.getByMonth(month),
    enabled: !!month,
  });
}

export function useSalesByType(type: string) {
  return useQuery({
    queryKey: ['sales', 'type', type],
    queryFn: () => salesApi.getByType(type),
    enabled: !!type,
  });
}

export function useSalesSummary(startMonth: string, endMonth: string) {
  return useQuery({
    queryKey: ['sales', 'summary', startMonth, endMonth],
    queryFn: () => salesApi.getSummary(startMonth, endMonth),
    enabled: !!startMonth && !!endMonth,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSaleData }) => 
      salesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales', variables.id] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: salesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });
}

