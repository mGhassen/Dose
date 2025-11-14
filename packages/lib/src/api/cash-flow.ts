import { apiRequest } from './api';
import type { CashFlowEntry, CreateCashFlowEntryData, UpdateCashFlowEntryData } from '@kit/types';

export const cashFlowApi = {
  getAll: () => apiRequest<CashFlowEntry[]>('GET', '/api/cash-flow'),
  getById: (id: string) => apiRequest<CashFlowEntry>('GET', `/api/cash-flow/${id}`),
  create: (data: CreateCashFlowEntryData) => apiRequest<CashFlowEntry>('POST', '/api/cash-flow', data),
  update: (id: string, data: UpdateCashFlowEntryData) => apiRequest<CashFlowEntry>('PUT', `/api/cash-flow/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/cash-flow/${id}`),
  getByMonth: (month: string) => apiRequest<CashFlowEntry>('GET', `/api/cash-flow?month=${month}`),
  getProjection: (startMonth: string, endMonth: string) => 
    apiRequest<CashFlowEntry[]>('GET', `/api/cash-flow/projection?start=${startMonth}&end=${endMonth}`),
};

