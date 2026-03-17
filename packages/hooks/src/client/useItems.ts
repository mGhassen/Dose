import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '@kit/lib';
import type { Item, CreateItemData, UpdateItemData } from '@kit/types';

export function useItems(params?: { page?: number; limit?: number; itemType?: string; includeRecipes?: boolean; producedOnly?: boolean }) {
  return useQuery({
    queryKey: ['items', params],
    queryFn: async () => {
      try {
        const result = await itemsApi.getAll(params);
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        if (Array.isArray(result)) {
          const arr = result as import('@kit/types').Item[];
          return {
            data: arr,
            pagination: {
              page: 1,
              limit: arr.length,
              total: arr.length,
              totalPages: 1,
              hasMore: false,
            },
          };
        }
        console.warn('[useItems] Unexpected response format:', result);
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
        console.error('[useItems] Error fetching items:', error);
        throw error;
      }
    },
  });
}

export function useItemById(id: string) {
  return useQuery<Item | null>({
    queryKey: ['items', id],
    queryFn: async () => {
      try {
        return await itemsApi.getById(id);
      } catch (err) {
        const maybeErr = err as { status?: number } | undefined;
        if (maybeErr?.status === 404) return null;
        throw err;
      }
    },
    enabled: !!id,
    retry: (failureCount, error) => ((error as { status?: number } | undefined)?.status === 404 ? false : failureCount < 3),
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateItemData }) => 
      itemsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', variables.id] });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
