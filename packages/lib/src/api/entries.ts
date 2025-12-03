import { apiRequest } from './api';
import type { PaginatedResponse, PaginationParams } from '@kit/types';

export interface Entry {
  id: number;
  direction: 'input' | 'output';
  entryType: string;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  vendor?: string;
  entryDate: string;
  dueDate?: string;
  isRecurring: boolean;
  recurrenceType?: string;
  referenceId?: number;
  scheduleEntryId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
}

export interface Payment {
  id: number;
  entryId: number;
  paymentDate: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryData {
  direction: 'input' | 'output';
  entryType: string;
  name: string;
  amount: number;
  description?: string;
  category?: string;
  vendor?: string;
  entryDate: string;
  dueDate?: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  referenceId?: number;
  scheduleEntryId?: number;
}

export interface UpdateEntryData extends Partial<CreateEntryData> {
  isActive?: boolean;
}

export const entriesApi = {
  getAll: (params?: PaginationParams & { 
    direction?: 'input' | 'output'; 
    entryType?: string; 
    category?: string; 
    month?: string;
    includePayments?: boolean;
    referenceId?: number;
    scheduleEntryId?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.direction) searchParams.append('direction', params.direction);
    if (params?.entryType) searchParams.append('entryType', params.entryType);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.month) searchParams.append('month', params.month);
    if (params?.includePayments) searchParams.append('includePayments', 'true');
    if (params?.referenceId) searchParams.append('referenceId', params.referenceId.toString());
    if (params?.scheduleEntryId) searchParams.append('scheduleEntryId', params.scheduleEntryId.toString());
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Entry>>('GET', `/api/entries${query ? `?${query}` : ''}`);
  },
  getById: (id: string, includePayments: boolean = true) => {
    const query = includePayments ? '?includePayments=true' : '';
    return apiRequest<Entry>('GET', `/api/entries/${id}${query}`);
  },
  create: (data: CreateEntryData) => apiRequest<Entry>('POST', '/api/entries', data),
  update: (id: string, data: UpdateEntryData) => apiRequest<Entry>('PUT', `/api/entries/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/entries/${id}`),
};

