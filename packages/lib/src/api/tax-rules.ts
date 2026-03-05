import { apiRequest } from './api';
import type { TaxRule, CreateTaxRuleData, UpdateTaxRuleData } from '@kit/types';

export const taxRulesApi = {
  getAll: () => apiRequest<TaxRule[]>('GET', '/api/tax-rules'),
  getById: (id: string) => apiRequest<TaxRule>('GET', `/api/tax-rules/${id}`),
  create: (data: CreateTaxRuleData) => apiRequest<TaxRule>('POST', '/api/tax-rules', data),
  update: (id: string, data: UpdateTaxRuleData) => apiRequest<TaxRule>('PUT', `/api/tax-rules/${id}`, data),
  delete: (id: string) => apiRequest<{ success: boolean }>('DELETE', `/api/tax-rules/${id}`),
  resolve: (params: { context: 'sale' | 'expense'; date?: string; salesType?: string; itemId?: number; itemCategory?: string }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('context', params.context);
    if (params.date) searchParams.set('date', params.date);
    if (params.salesType) searchParams.set('salesType', params.salesType);
    if (params.itemId != null) searchParams.set('itemId', String(params.itemId));
    if (params.itemCategory) searchParams.set('itemCategory', params.itemCategory);
    return apiRequest<{ rate: number }>('GET', `/api/tax-rules/resolve?${searchParams.toString()}`);
  },
};
