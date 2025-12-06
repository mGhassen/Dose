import { apiRequest } from './api';
import type { StockLevel, CreateStockLevelData, UpdateStockLevelData, PaginatedResponse, PaginationParams } from '@kit/types';

export const stockLevelsApi = {
  getAll: (params?: PaginationParams & { itemId?: string; ingredientId?: string; location?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.itemId) searchParams.append('itemId', params.itemId);
    if (params?.ingredientId) searchParams.append('itemId', params.ingredientId); // Backward compat
    if (params?.location) searchParams.append('location', params.location);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<StockLevel>>('GET', `/api/stock-levels${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<StockLevel>('GET', `/api/stock-levels/${id}`),
  create: (data: CreateStockLevelData) => apiRequest<StockLevel>('POST', '/api/stock-levels', data),
  update: (id: string, data: UpdateStockLevelData) => apiRequest<StockLevel>('PUT', `/api/stock-levels/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/stock-levels/${id}`),
};

