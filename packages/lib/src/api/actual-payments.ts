import { apiRequest } from './api';

export interface ActualPayment {
  id: number;
  paymentType: 'loan' | 'leasing' | 'expense';
  referenceId: number;
  scheduleEntryId?: number;
  month: string; // YYYY-MM
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActualPaymentData {
  paymentType: 'loan' | 'leasing' | 'expense';
  referenceId: number;
  scheduleEntryId?: number;
  month: string;
  paymentDate: string;
  amount: number;
  isPaid?: boolean;
  paidDate?: string;
  notes?: string;
}

export interface UpdateActualPaymentData {
  paymentDate?: string;
  amount?: number;
  isPaid?: boolean;
  paidDate?: string | null;
  notes?: string | null;
}

export const actualPaymentsApi = {
  getAll: (params?: { paymentType?: string; referenceId?: string; month?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.paymentType) queryParams.append('paymentType', params.paymentType);
    if (params?.referenceId) queryParams.append('referenceId', params.referenceId);
    if (params?.month) queryParams.append('month', params.month);
    const query = queryParams.toString();
    return apiRequest<ActualPayment[]>(`GET`, `/api/actual-payments${query ? `?${query}` : ''}`);
  },
  create: (data: CreateActualPaymentData) => apiRequest<ActualPayment>('POST', '/api/actual-payments', data),
  update: (id: string, data: UpdateActualPaymentData) => apiRequest<ActualPayment>('PUT', `/api/actual-payments/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/actual-payments/${id}`),
};

