import { apiRequest } from './api';
import type { BalanceSheet, CreateBalanceSheetData, UpdateBalanceSheetData } from '@kit/types';

export const balanceSheetApi = {
  getAll: () => apiRequest<BalanceSheet[]>('GET', '/api/balance-sheet'),
  getById: (id: string) => apiRequest<BalanceSheet>('GET', `/api/balance-sheet/${id}`),
  create: (data: CreateBalanceSheetData) => apiRequest<BalanceSheet>('POST', '/api/balance-sheet', data),
  update: (id: string, data: UpdateBalanceSheetData) => apiRequest<BalanceSheet>('PUT', `/api/balance-sheet/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/balance-sheet/${id}`),
  getByMonth: (month: string) => apiRequest<BalanceSheet | null>('GET', `/api/balance-sheet?month=${month}`),
  calculate: (month: string) => apiRequest<BalanceSheet>('POST', `/api/balance-sheet/calculate?month=${month}`),
};

