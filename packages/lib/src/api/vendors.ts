import { apiRequest } from './api';
import type { Vendor, CreateVendorData, UpdateVendorData, PaginatedResponse, PaginationParams } from '@kit/types';

export const vendorsApi = {
  getAll: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Vendor>>('GET', `/api/vendors${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Vendor>('GET', `/api/vendors/${id}`),
  create: (data: CreateVendorData) => apiRequest<Vendor>('POST', '/api/vendors', data),
  update: (id: string, data: UpdateVendorData) => apiRequest<Vendor>('PUT', `/api/vendors/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/vendors/${id}`),
};

