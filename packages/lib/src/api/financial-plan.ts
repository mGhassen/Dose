import { apiRequest } from './api';
import type { FinancialPlan, CreateFinancialPlanData, UpdateFinancialPlanData } from '@kit/types';

export const financialPlanApi = {
  getAll: () => apiRequest<FinancialPlan[]>('GET', '/api/financial-plan'),
  getById: (id: string) => apiRequest<FinancialPlan>('GET', `/api/financial-plan/${id}`),
  create: (data: CreateFinancialPlanData) => apiRequest<FinancialPlan>('POST', '/api/financial-plan', data),
  update: (id: string, data: UpdateFinancialPlanData) => apiRequest<FinancialPlan>('PUT', `/api/financial-plan/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/financial-plan/${id}`),
  getByMonth: (month: string) => apiRequest<FinancialPlan>('GET', `/api/financial-plan?month=${month}`),
  calculate: (month: string) => apiRequest<FinancialPlan>('POST', `/api/financial-plan/calculate?month=${month}`),
};

