import { apiRequest } from './api';
import type { 
  Expense, 
  CreateExpenseData, 
  UpdateExpenseData,
  ExpenseProjection,
  AnnualExpenseBudget,
  ExpenseProjectionSummary,
  PaginatedResponse,
  PaginationParams
} from '@kit/types';

export const expensesApi = {
  getAll: (params?: PaginationParams & { category?: string; month?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.month) searchParams.append('month', params.month);
    const query = searchParams.toString();
    return apiRequest<PaginatedResponse<Expense>>('GET', `/api/expenses${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<Expense>('GET', `/api/expenses/${id}`),
  create: (data: CreateExpenseData) => apiRequest<Expense>('POST', '/api/expenses', data),
  update: (id: string, data: UpdateExpenseData) => apiRequest<Expense>('PUT', `/api/expenses/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/expenses/${id}`),
  getByCategory: (category: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('category', category);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Expense>>('GET', `/api/expenses?${searchParams.toString()}`);
  },
  getByMonth: (month: string, params?: PaginationParams) => {
    const searchParams = new URLSearchParams();
    searchParams.append('month', month);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    return apiRequest<PaginatedResponse<Expense>>('GET', `/api/expenses?${searchParams.toString()}`);
  },
  // Annual budgeting projections
  getProjections: (year: string) => apiRequest<ExpenseProjection[]>('GET', `/api/expenses/projections?year=${year}`),
  getAnnualBudget: (year: string) => apiRequest<AnnualExpenseBudget[]>('GET', `/api/expenses/annual-budget?year=${year}`),
  getProjectionSummary: (year: string) => apiRequest<ExpenseProjectionSummary>('GET', `/api/expenses/projection-summary?year=${year}`),
  getMonthlyProjections: (startMonth: string, endMonth: string) => 
    apiRequest<ExpenseProjection[]>('GET', `/api/expenses/projections?start=${startMonth}&end=${endMonth}`),
};

