import { apiRequest } from './api';
import type { ExpiryDate, CreateExpiryDateData, UpdateExpiryDateData, PaginatedResponse, PaginationParams } from '@kit/types';

export const expiryDatesApi = {
  getAll: (params?: PaginationParams & { ingredientId?: string; isExpired?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.ingredientId) searchParams.append('ingredientId', params.ingredientId);
    if (params?.isExpired !== undefined) searchParams.append('isExpired', params.isExpired.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<ExpiryDate>>('GET', `/api/expiry-dates${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<ExpiryDate>('GET', `/api/expiry-dates/${id}`),
  create: (data: CreateExpiryDateData) => apiRequest<ExpiryDate>('POST', '/api/expiry-dates', data),
  update: (id: string, data: UpdateExpiryDateData) => apiRequest<ExpiryDate>('PUT', `/api/expiry-dates/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/expiry-dates/${id}`),
};

