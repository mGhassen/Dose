import { apiRequest } from './api';
import type { StockMovement, CreateStockMovementData, UpdateStockMovementData, PaginatedResponse, PaginationParams } from '@kit/types';

export const stockMovementsApi = {
  getAll: (params?: PaginationParams & { itemId?: string; ingredientId?: string; movementType?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.itemId) searchParams.append('itemId', params.itemId);
    if (params?.ingredientId) searchParams.append('ingredientId', params.ingredientId);
    if (params?.movementType) searchParams.append('movementType', params.movementType);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<StockMovement>>('GET', `/api/stock-movements${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<StockMovement>('GET', `/api/stock-movements/${id}`),
  create: (data: CreateStockMovementData) => apiRequest<StockMovement>('POST', '/api/stock-movements', data),
  update: (id: string, data: UpdateStockMovementData) => apiRequest<StockMovement>('PUT', `/api/stock-movements/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/stock-movements/${id}`),
};

