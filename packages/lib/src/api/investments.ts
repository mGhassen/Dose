import { apiRequest } from './api';
import type { Investment, DepreciationEntry, CreateInvestmentData, UpdateInvestmentData } from '@kit/types';

export const investmentsApi = {
  getAll: () => apiRequest<Investment[]>('GET', '/api/investments'),
  getById: (id: string) => apiRequest<Investment>('GET', `/api/investments/${id}`),
  create: (data: CreateInvestmentData) => apiRequest<Investment>('POST', '/api/investments', data),
  update: (id: string, data: UpdateInvestmentData) => apiRequest<Investment>('PUT', `/api/investments/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/investments/${id}`),
  getDepreciation: (investmentId: string) => apiRequest<DepreciationEntry[]>('GET', `/api/investments/${investmentId}/depreciation`),
  generateDepreciation: (investmentId: string) => apiRequest<DepreciationEntry[]>('POST', `/api/investments/${investmentId}/generate-depreciation`),
};

