import { apiRequest } from './api';
import type { Item, CreateItemData, UpdateItemData, PaginatedResponse, PaginationParams } from '@kit/types';

export const itemsApi = {
  getAll: (params?: PaginationParams & { includeRecipes?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.includeRecipes) searchParams.append('includeRecipes', 'true');
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Item>>('GET', `/api/items${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Item>('GET', `/api/items/${id}`),
  create: (data: CreateItemData) => apiRequest<Item>('POST', '/api/items', data),
  update: (id: string, data: UpdateItemData) => apiRequest<Item>('PUT', `/api/items/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/items/${id}`),
};

// Legacy alias for backward compatibility
export const ingredientsApi = itemsApi;
