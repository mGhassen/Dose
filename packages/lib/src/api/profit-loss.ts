import { apiRequest } from './api';
import type { ProfitAndLoss, CreateProfitAndLossData, UpdateProfitAndLossData } from '@kit/types';

export const profitLossApi = {
  getAll: () => apiRequest<ProfitAndLoss[]>('GET', '/api/profit-loss'),
  getById: (id: string) => apiRequest<ProfitAndLoss>('GET', `/api/profit-loss/${id}`),
  create: (data: CreateProfitAndLossData) => apiRequest<ProfitAndLoss>('POST', '/api/profit-loss', data),
  update: (id: string, data: UpdateProfitAndLossData) => apiRequest<ProfitAndLoss>('PUT', `/api/profit-loss/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/profit-loss/${id}`),
  getByMonth: (month: string) => apiRequest<ProfitAndLoss | null>('GET', `/api/profit-loss?month=${month}`),
  calculate: (month: string) => apiRequest<ProfitAndLoss>('POST', `/api/profit-loss/calculate?month=${month}`),
};

