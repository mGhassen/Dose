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
};

