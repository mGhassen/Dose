import { apiRequest } from './api';
import type { Sale, SalesSummary, CreateSaleData, UpdateSaleData } from '@kit/types';

export const salesApi = {
  getAll: () => apiRequest<Sale[]>('GET', '/api/sales'),
  getById: (id: string) => apiRequest<Sale>('GET', `/api/sales/${id}`),
  create: (data: CreateSaleData) => apiRequest<Sale>('POST', '/api/sales', data),
  update: (id: string, data: UpdateSaleData) => apiRequest<Sale>('PUT', `/api/sales/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/sales/${id}`),
  getSummary: (startMonth: string, endMonth: string) => 
    apiRequest<SalesSummary[]>('GET', `/api/sales/summary?start=${startMonth}&end=${endMonth}`),
  getByMonth: (month: string) => apiRequest<Sale[]>('GET', `/api/sales?month=${month}`),
  getByType: (type: string) => apiRequest<Sale[]>('GET', `/api/sales?type=${type}`),
};

