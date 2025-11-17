import { apiRequest } from './api';
import type { Supplier, CreateSupplierData, UpdateSupplierData, PaginatedResponse, PaginationParams } from '@kit/types';

export const inventorySuppliersApi = {
  getAll: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Supplier>>('GET', `/api/suppliers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Supplier>('GET', `/api/suppliers/${id}`),
  create: (data: CreateSupplierData) => apiRequest<Supplier>('POST', '/api/suppliers', data),
  update: (id: string, data: UpdateSupplierData) => apiRequest<Supplier>('PUT', `/api/suppliers/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/suppliers/${id}`),
};

