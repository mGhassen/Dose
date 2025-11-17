import { apiRequest } from './api';
import type { SupplierOrder, CreateSupplierOrderData, UpdateSupplierOrderData, PaginatedResponse, PaginationParams } from '@kit/types';

export const supplierOrdersApi = {
  getAll: (params?: PaginationParams & { supplierId?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.supplierId) searchParams.append('supplierId', params.supplierId);
    if (params?.status) searchParams.append('status', params.status);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<SupplierOrder>>('GET', `/api/supplier-orders${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<SupplierOrder>('GET', `/api/supplier-orders/${id}`),
  create: (data: CreateSupplierOrderData) => apiRequest<SupplierOrder>('POST', '/api/supplier-orders', data),
  update: (id: string, data: UpdateSupplierOrderData) => apiRequest<SupplierOrder>('PUT', `/api/supplier-orders/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/supplier-orders/${id}`),
};

