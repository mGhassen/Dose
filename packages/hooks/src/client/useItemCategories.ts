import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getItemCategories,
  createItemCategory,
  updateItemCategory,
  deleteItemCategory,
  type ItemCategory,
  type CreateItemCategoryData,
  type UpdateItemCategoryData,
} from '@kit/lib/api/item-categories';

export type { ItemCategory, CreateItemCategoryData, UpdateItemCategoryData };

export function useItemCategories(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: ['itemCategories', options?.includeInactive ? 'all' : 'active'],
    queryFn: () => getItemCategories(options),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateItemCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateItemCategoryData) => createItemCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itemCategories'] });
    },
  });
}

export function useUpdateItemCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateItemCategoryData }) =>
      updateItemCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itemCategories'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useDeleteItemCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteItemCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['itemCategories'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
