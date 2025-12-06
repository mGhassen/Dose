// React Query hooks for Ingredients (legacy - use useItems instead)
// Kept for backward compatibility

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi } from '@kit/lib';
import type { Item, CreateItemData, UpdateItemData } from '@kit/types';

// Legacy type aliases
type Ingredient = Item;
type CreateIngredientData = CreateItemData;
type UpdateIngredientData = UpdateItemData;

export function useIngredients(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['ingredients', params],
    queryFn: async () => {
      try {
        // Filter to only items (not recipes) for backward compatibility
        const result = await itemsApi.getAll({ ...params, itemType: 'item' });
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
        console.warn('[useIngredients] Unexpected response format:', result);
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
        console.error('[useIngredients] Error fetching ingredients:', error);
        throw error;
      }
    },
  });
}

export function useIngredientById(id: string) {
  return useQuery({
    queryKey: ['ingredients', id],
    queryFn: () => itemsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateIngredientData) => itemsApi.create({ ...data, itemType: 'item' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIngredientData }) => 
      itemsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', variables.id] });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: itemsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

