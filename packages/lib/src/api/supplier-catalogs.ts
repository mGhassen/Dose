import { apiRequest } from './api';
import type { SupplierCatalog, CreateSupplierCatalogData, UpdateSupplierCatalogData, PaginatedResponse, PaginationParams } from '@kit/types';

export const supplierCatalogsApi = {
  getAll: (params?: PaginationParams & { supplierId?: string; ingredientId?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.supplierId) searchParams.append('supplierId', params.supplierId);
    if (params?.ingredientId) searchParams.append('ingredientId', params.ingredientId);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<SupplierCatalog>>('GET', `/api/supplier-catalogs${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<SupplierCatalog>('GET', `/api/supplier-catalogs/${id}`),
  create: (data: CreateSupplierCatalogData) => apiRequest<SupplierCatalog>('POST', '/api/supplier-catalogs', data),
  update: (id: string, data: UpdateSupplierCatalogData) => apiRequest<SupplierCatalog>('PUT', `/api/supplier-catalogs/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/supplier-catalogs/${id}`),
};

