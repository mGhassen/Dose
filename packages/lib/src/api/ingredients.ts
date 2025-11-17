import { apiRequest } from './api';
import type { Ingredient, CreateIngredientData, UpdateIngredientData, PaginatedResponse, PaginationParams } from '@kit/types';

export const ingredientsApi = {
  getAll: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Ingredient>>('GET', `/api/ingredients${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Ingredient>('GET', `/api/ingredients/${id}`),
  create: (data: CreateIngredientData) => apiRequest<Ingredient>('POST', '/api/ingredients', data),
  update: (id: string, data: UpdateIngredientData) => apiRequest<Ingredient>('PUT', `/api/ingredients/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/ingredients/${id}`),
};

