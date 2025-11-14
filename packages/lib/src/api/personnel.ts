import { apiRequest } from './api';
import type { Personnel, PersonnelProjection, CreatePersonnelData, UpdatePersonnelData } from '@kit/types';

export const personnelApi = {
  getAll: () => apiRequest<Personnel[]>('GET', '/api/personnel'),
  getById: (id: string) => apiRequest<Personnel>('GET', `/api/personnel/${id}`),
  create: (data: CreatePersonnelData) => apiRequest<Personnel>('POST', '/api/personnel', data),
  update: (id: string, data: UpdatePersonnelData) => apiRequest<Personnel>('PUT', `/api/personnel/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/personnel/${id}`),
  getProjections: (startMonth: string, endMonth: string) => 
    apiRequest<PersonnelProjection[]>('GET', `/api/personnel/projections?start=${startMonth}&end=${endMonth}`),
  getTotalCost: (month: string) => apiRequest<{ totalCost: number; headcount: number }>('GET', `/api/personnel/total-cost?month=${month}`),
};

