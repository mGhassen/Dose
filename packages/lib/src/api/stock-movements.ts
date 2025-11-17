import { apiRequest } from './api';
import type { StockMovement, CreateStockMovementData, UpdateStockMovementData, PaginatedResponse, PaginationParams } from '@kit/types';

export const stockMovementsApi = {
  getAll: (params?: PaginationParams & { ingredientId?: string; movementType?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.ingredientId) searchParams.append('ingredientId', params.ingredientId);
    if (params?.movementType) searchParams.append('movementType', params.movementType);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<StockMovement>>('GET', `/api/stock-movements${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<StockMovement>('GET', `/api/stock-movements/${id}`),
  create: (data: CreateStockMovementData) => apiRequest<StockMovement>('POST', '/api/stock-movements', data),
  update: (id: string, data: UpdateStockMovementData) => apiRequest<StockMovement>('PUT', `/api/stock-movements/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/stock-movements/${id}`),
};

