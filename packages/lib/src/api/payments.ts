import { apiRequest } from './api';
import type { PaginatedResponse, PaginationParams } from '@kit/types';

export interface Payment {
  id: number;
  entryId: number;
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  bankTransactionId?: number;
  paymentGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentData {
  entryId?: number;
  entryType?: 'expense' | 'sale';
  referenceId?: number;
  paymentDate: string;
  amount: number;
  isPaid?: boolean;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  bankTransactionId?: number;
  paymentGroupId?: string;
}

export type UpdatePaymentData = Partial<Omit<CreatePaymentData, "bankTransactionId" | "paymentGroupId">> & {
  bankTransactionId?: number | null;
  paymentGroupId?: string | null;
};

export const paymentsApi = {
  getAll: (params?: PaginationParams & {
    entryId?: string;
    loanId?: string;
    entryType?: 'expense' | 'sale';
    referenceId?: string;
    bankTransactionId?: string;
    isPaid?: boolean;
    month?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.entryId) searchParams.append('entryId', params.entryId);
    if (params?.loanId) searchParams.append('loanId', params.loanId);
    if (params?.entryType) searchParams.append('entryType', params.entryType);
    if (params?.referenceId) searchParams.append('referenceId', params.referenceId);
    if (params?.bankTransactionId) searchParams.append('bankTransactionId', params.bankTransactionId);
    if (params?.isPaid !== undefined) searchParams.append('isPaid', params.isPaid.toString());
    if (params?.month) searchParams.append('month', params.month);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Payment>>('GET', `/api/payments${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Payment>('GET', `/api/payments/${id}`),
  create: (data: CreatePaymentData) => apiRequest<Payment>('POST', '/api/payments', data),
  update: (id: string, data: UpdatePaymentData) => apiRequest<Payment>('PUT', `/api/payments/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/payments/${id}`),
};

