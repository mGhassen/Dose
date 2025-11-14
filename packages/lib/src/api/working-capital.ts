import { apiRequest } from './api';
import type { WorkingCapital, CreateWorkingCapitalData, UpdateWorkingCapitalData } from '@kit/types';

export const workingCapitalApi = {
  getAll: () => apiRequest<WorkingCapital[]>('GET', '/api/working-capital'),
  getById: (id: string) => apiRequest<WorkingCapital>('GET', `/api/working-capital/${id}`),
  create: (data: CreateWorkingCapitalData) => apiRequest<WorkingCapital>('POST', '/api/working-capital', data),
  update: (id: string, data: UpdateWorkingCapitalData) => apiRequest<WorkingCapital>('PUT', `/api/working-capital/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/working-capital/${id}`),
  getByMonth: (month: string) => apiRequest<WorkingCapital>('GET', `/api/working-capital?month=${month}`),
  calculate: (month: string) => apiRequest<WorkingCapital>('POST', `/api/working-capital/calculate?month=${month}`),
};

