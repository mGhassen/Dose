// React Query hooks for Recipes

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from '@kit/lib';
import type { Recipe, CreateRecipeData, UpdateRecipeData } from '@kit/types';

export function useRecipes(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['recipes', params],
    queryFn: async () => {
      try {
        const result = await recipesApi.getAll(params);
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
        console.warn('[useRecipes] Unexpected response format:', result);
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
        console.error('[useRecipes] Error fetching recipes:', error);
        throw error;
      }
    },
  });
}

export function useRecipeById(id: string) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: () => recipesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: recipesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecipeData }) => 
      recipesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', variables.id] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: recipesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useProduceRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity: number; location?: string; notes?: string } }) => 
      recipesApi.produce(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
    },
  });
}

export function useRecipeCost(id: string) {
  return useQuery({
    queryKey: ['recipes', id, 'cost'],
    queryFn: () => recipesApi.getCost(id),
    enabled: !!id,
  });
}

