import { apiRequest } from './api';
import type { Personnel, PersonnelProjection, PersonnelSalaryProjection, PersonnelHourEntry, CreatePersonnelData, UpdatePersonnelData, CreatePersonnelSalaryProjectionData, UpdatePersonnelSalaryProjectionData, CreatePersonnelHourEntryData, UpdatePersonnelHourEntryData, PaginatedResponse, PaginationParams } from '@kit/types';

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
  getHourEntries: (id: string) =>
    apiRequest<PersonnelHourEntry[]>('GET', `/api/personnel/${id}/hours`),
  createHourEntry: (id: string, data: CreatePersonnelHourEntryData) =>
    apiRequest<PersonnelHourEntry>('POST', `/api/personnel/${id}/hours`, data),
  updateHourEntry: (id: string, entryId: string, data: UpdatePersonnelHourEntryData) =>
    apiRequest<PersonnelHourEntry>('PUT', `/api/personnel/${id}/hours/${entryId}`, data),
  deleteHourEntry: (id: string, entryId: string) =>
    apiRequest<void>('DELETE', `/api/personnel/${id}/hours/${entryId}`),
  markHourEntryPaid: (
    id: string,
    entryId: string,
    data: { isPaid: boolean; paidDate?: string; category?: string; amount?: number }
  ) =>
    apiRequest<{ id: number; isPaid: boolean; paidDate?: string; expenseId?: number | null }>(
      'POST',
      `/api/personnel/${id}/hours/${entryId}/mark-paid`,
      data
    ),
  reconcileHourEntryPayments: (id: string, entryId: string) =>
    apiRequest<{ paidTotal: number; gross: number; isPaid: boolean; paidDate: string | null }>(
      'POST',
      `/api/personnel/${id}/hours/${entryId}/reconcile-payments`
    ),
};

