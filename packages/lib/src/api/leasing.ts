import { apiRequest } from './api';
import type { LeasingPayment, CreateLeasingPaymentData, UpdateLeasingPaymentData, PaginatedResponse, PaginationParams } from '@kit/types';

export const leasingApi = {
  getAll: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<LeasingPayment>>('GET', `/api/leasing${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<LeasingPayment>('GET', `/api/leasing/${id}`),
  create: (data: CreateLeasingPaymentData) => apiRequest<LeasingPayment>('POST', '/api/leasing', data),
  update: (id: string, data: UpdateLeasingPaymentData) => apiRequest<LeasingPayment>('PUT', `/api/leasing/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/leasing/${id}`),
};

