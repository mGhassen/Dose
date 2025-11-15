import { apiRequest } from './api';
import type { Personnel, PersonnelProjection, CreatePersonnelData, UpdatePersonnelData, PaginatedResponse, PaginationParams } from '@kit/types';

export const personnelApi = {
  getAll: (params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Personnel>>('GET', `/api/personnel${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Personnel>('GET', `/api/personnel/${id}`),
  create: (data: CreatePersonnelData) => apiRequest<Personnel>('POST', '/api/personnel', data),
  update: (id: string, data: UpdatePersonnelData) => apiRequest<Personnel>('PUT', `/api/personnel/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/personnel/${id}`),
  getProjections: (startMonth: string, endMonth: string) => 
    apiRequest<PersonnelProjection[]>('GET', `/api/personnel/projections?start=${startMonth}&end=${endMonth}`),
  getTotalCost: (month: string) => apiRequest<{ totalCost: number; headcount: number }>('GET', `/api/personnel/total-cost?month=${month}`),
};

