import { apiRequest } from './api';
import type { Variable, CreateVariableData, UpdateVariableData } from '@kit/types';

export const variablesApi = {
  getAll: () => apiRequest<Variable[]>('GET', '/api/variables'),
  getById: (id: string) => apiRequest<Variable>('GET', `/api/variables/${id}`),
  create: (data: CreateVariableData) => apiRequest<Variable>('POST', '/api/variables', data),
  update: (id: string, data: UpdateVariableData) => apiRequest<Variable>('PUT', `/api/variables/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/variables/${id}`),
  getByType: (type: string) => apiRequest<Variable[]>('GET', `/api/variables?type=${type}`),
};

