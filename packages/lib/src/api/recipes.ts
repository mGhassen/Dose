import { apiRequest } from './api';
import type { Recipe, RecipeWithIngredients, CreateRecipeData, UpdateRecipeData, PaginatedResponse, PaginationParams } from '@kit/types';

export const recipesApi = {
  getAll: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Recipe>>('GET', `/api/recipes${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<RecipeWithIngredients>('GET', `/api/recipes/${id}`),
  create: (data: CreateRecipeData) => apiRequest<Recipe>('POST', '/api/recipes', data),
  update: (id: string, data: UpdateRecipeData) => apiRequest<Recipe>('PUT', `/api/recipes/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/recipes/${id}`),
  produce: (id: string, data: { quantity: number; location?: string; notes?: string }) => 
    apiRequest<{ success: boolean; message: string; movements: Array<{ ingredientId: number; quantity: number }>; recipe: { id: number; name: string; quantityProduced: number } }>('POST', `/api/recipes/${id}/produce`, data),
  getCost: (id: string) => 
    apiRequest<{ recipeId: number; recipeName: string; totalCost: number; costPerServing: number; servingSize: number; ingredients: Array<{ ingredientId: number; ingredientName: string; quantity: number; unit: string; unitPrice: number; totalCost: number; hasPrice: boolean }>; hasAllPrices: boolean }>('GET', `/api/recipes/${id}/cost`),
};

