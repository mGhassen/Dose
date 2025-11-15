import { apiRequest } from './api';
import type { FinancialPlan, CreateFinancialPlanData, UpdateFinancialPlanData } from '@kit/types';

export const financialPlanApi = {
  getAll: (signal?: AbortSignal) => apiRequest<FinancialPlan[]>('GET', '/api/financial-plan', undefined, signal),
  getById: (id: string, signal?: AbortSignal) => apiRequest<FinancialPlan>('GET', `/api/financial-plan/${id}`, undefined, signal),
  create: (data: CreateFinancialPlanData, signal?: AbortSignal) => apiRequest<FinancialPlan>('POST', '/api/financial-plan', data, signal),
  update: (id: string, data: UpdateFinancialPlanData, signal?: AbortSignal) => apiRequest<FinancialPlan>('PUT', `/api/financial-plan/${id}`, data, signal),
  delete: (id: string, signal?: AbortSignal) => apiRequest<void>('DELETE', `/api/financial-plan/${id}`, undefined, signal),
  getByMonth: (month: string, signal?: AbortSignal) => apiRequest<FinancialPlan>('GET', `/api/financial-plan?month=${month}`, undefined, signal),
  calculate: (month: string, signal?: AbortSignal) => apiRequest<FinancialPlan>('POST', `/api/financial-plan/calculate?month=${month}`, undefined, signal),
};

