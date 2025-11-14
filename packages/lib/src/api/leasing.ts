import { apiRequest } from './api';
import type { LeasingPayment, CreateLeasingPaymentData, UpdateLeasingPaymentData } from '@kit/types';

export const leasingApi = {
  getAll: () => apiRequest<LeasingPayment[]>('GET', '/api/leasing'),
  getById: (id: string) => apiRequest<LeasingPayment>('GET', `/api/leasing/${id}`),
  create: (data: CreateLeasingPaymentData) => apiRequest<LeasingPayment>('POST', '/api/leasing', data),
  update: (id: string, data: UpdateLeasingPaymentData) => apiRequest<LeasingPayment>('PUT', `/api/leasing/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/leasing/${id}`),
};

