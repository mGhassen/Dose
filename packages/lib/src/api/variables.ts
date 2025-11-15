import { apiRequest } from './api';
import type { Variable, CreateVariableData, UpdateVariableData, PaginatedResponse, PaginationParams } from '@kit/types';

export const variablesApi = {
  getAll: (params?: PaginationParams & { type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Variable>>('GET', `/api/variables${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Variable>('GET', `/api/variables/${id}`),
  create: (data: CreateVariableData) => apiRequest<Variable>('POST', '/api/variables', data),
  update: (id: string, data: UpdateVariableData) => apiRequest<Variable>('PUT', `/api/variables/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/variables/${id}`),
  getByType: (type: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('type', type);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Variable>>('GET', `/api/variables?${searchParams.toString()}`);
  },
};

