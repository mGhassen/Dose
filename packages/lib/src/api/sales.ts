import { apiRequest } from './api';
import type { Sale, SalesSummary, CreateSaleData, UpdateSaleData, PaginatedResponse, PaginationParams } from '@kit/types';

export const salesApi = {
  getAll: (params?: PaginationParams & { month?: string; type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.month) searchParams.append('month', params.month);
    if (params?.type) searchParams.append('type', params.type);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Sale>>('GET', `/api/sales${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Sale>('GET', `/api/sales/${id}`),
  create: (data: CreateSaleData) => apiRequest<Sale>('POST', '/api/sales', data),
  update: (id: string, data: UpdateSaleData) => apiRequest<Sale>('PUT', `/api/sales/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/sales/${id}`),
  getSummary: (startMonth: string, endMonth: string) => 
    apiRequest<SalesSummary[]>('GET', `/api/sales/summary?start=${startMonth}&end=${endMonth}`),
  getByMonth: (month: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('month', month);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Sale>>('GET', `/api/sales?${searchParams.toString()}`);
  },
  getByType: (type: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('type', type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Sale>>('GET', `/api/sales?${searchParams.toString()}`);
  },
};

