import { apiRequest } from './api';
import type { Personnel, PersonnelProjection, PersonnelSalaryProjection, CreatePersonnelData, UpdatePersonnelData, CreatePersonnelSalaryProjectionData, UpdatePersonnelSalaryProjectionData, PaginatedResponse, PaginationParams } from '@kit/types';

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
  getSalaryProjections: (id: string, startMonth?: string, endMonth?: string) => {
    const searchParams = new URLSearchParams();
    if (startMonth) searchParams.append('startMonth', startMonth);
    if (endMonth) searchParams.append('endMonth', endMonth);
    const query = searchParams.toString();
    return apiRequest<PersonnelSalaryProjection[]>(`GET`, `/api/personnel/${id}/projections${query ? `?${query}` : ''}`);
  },
  createOrUpdateSalaryProjectionEntry: (id: string, data: CreatePersonnelSalaryProjectionData) =>
    apiRequest<PersonnelSalaryProjection>('POST', `/api/personnel/${id}/projections`, data),
  updateSalaryProjectionEntry: (id: string, entryId: string, data: UpdatePersonnelSalaryProjectionData) => 
    apiRequest<PersonnelSalaryProjection>('PUT', `/api/personnel/${id}/projections/${entryId}`, data),
  deleteSalaryProjectionEntry: (id: string, entryId: string) => 
    apiRequest<void>('DELETE', `/api/personnel/${id}/projections/${entryId}`),
};

