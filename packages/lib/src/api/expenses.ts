import { apiRequest } from './api';
import type { 
  Expense, 
  CreateExpenseData, 
  UpdateExpenseData,
  ExpenseProjection,
  AnnualExpenseBudget,
  ExpenseProjectionSummary
} from '@kit/types';

export const expensesApi = {
  getAll: () => apiRequest<Expense[]>('GET', '/api/expenses'),
  getById: (id: string) => apiRequest<Expense>('GET', `/api/expenses/${id}`),
  create: (data: CreateExpenseData) => apiRequest<Expense>('POST', '/api/expenses', data),
  update: (id: string, data: UpdateExpenseData) => apiRequest<Expense>('PUT', `/api/expenses/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/expenses/${id}`),
  getByCategory: (category: string) => apiRequest<Expense[]>('GET', `/api/expenses?category=${category}`),
  getByMonth: (month: string) => apiRequest<Expense[]>('GET', `/api/expenses?month=${month}`),
  // Annual budgeting projections
  getProjections: (year: string) => apiRequest<ExpenseProjection[]>('GET', `/api/expenses/projections?year=${year}`),
  getAnnualBudget: (year: string) => apiRequest<AnnualExpenseBudget[]>('GET', `/api/expenses/annual-budget?year=${year}`),
  getProjectionSummary: (year: string) => apiRequest<ExpenseProjectionSummary>('GET', `/api/expenses/projection-summary?year=${year}`),
  getMonthlyProjections: (startMonth: string, endMonth: string) => 
    apiRequest<ExpenseProjection[]>('GET', `/api/expenses/projections?start=${startMonth}&end=${endMonth}`),
};

