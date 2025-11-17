// React Query hooks for Ingredients

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ingredientsApi } from '@kit/lib';
import type { Ingredient, CreateIngredientData, UpdateIngredientData } from '@kit/types';

export function useIngredients(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['ingredients', params],
    queryFn: async () => {
      try {
        const result = await ingredientsApi.getAll(params);
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
    queryFn: () => ingredientsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ingredientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

export function useUpdateIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIngredientData }) => 
      ingredientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients', variables.id] });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ingredientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

