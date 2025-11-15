import { apiRequest } from './api';
import type { 
  Budget, 
  CreateBudgetData, 
  UpdateBudgetData,
  BudgetAccount,
  CreateBudgetAccountData,
  UpdateBudgetAccountData,
  BudgetEntry,
  CreateBudgetEntryData,
  UpdateBudgetEntryData,
  BudgetWithData,
  PaginatedResponse,
  PaginationParams
} from '@kit/types';

export const budgetsApi = {
  getAll: (options?: { fiscalYear?: string; includeAccounts?: boolean; includeEntries?: boolean } & PaginationParams) => {
    const params = new URLSearchParams();
    if (options?.fiscalYear) params.append('fiscalYear', options.fiscalYear);
    if (options?.includeAccounts) params.append('includeAccounts', 'true');
    if (options?.includeEntries) params.append('includeEntries', 'true');
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const query = params.toString();
    return apiRequest<PaginatedResponse<Budget>>(`GET`, `/api/budgets${query ? `?${query}` : ''}`);
  },
  
  getById: (id: number, options?: { includeAccounts?: boolean; includeEntries?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.includeAccounts === false) params.append('includeAccounts', 'false');
    if (options?.includeEntries === false) params.append('includeEntries', 'false');
    const query = params.toString();
    return apiRequest<BudgetWithData>(`GET`, `/api/budgets/${id}${query ? `?${query}` : ''}`);
  },
  
  create: (data: CreateBudgetData) => 
    apiRequest<Budget>('POST', '/api/budgets', data),
  
  update: (id: number, data: UpdateBudgetData) => 
    apiRequest<Budget>('PUT', `/api/budgets/${id}`, data),
  
  delete: (id: number) => 
    apiRequest<void>('DELETE', `/api/budgets/${id}`),

  // Accounts
  getAccounts: (budgetId: number) =>
    apiRequest<BudgetAccount[]>('GET', `/api/budgets/${budgetId}/accounts`),
  
  createAccount: (budgetId: number, data: CreateBudgetAccountData) =>
    apiRequest<BudgetAccount>('POST', `/api/budgets/${budgetId}/accounts`, { ...data, budgetId }),
  
  updateAccount: (budgetId: number, accountId: number, data: UpdateBudgetAccountData) =>
    apiRequest<BudgetAccount>('PUT', `/api/budgets/${budgetId}/accounts/${accountId}`, data),
  
  deleteAccount: (budgetId: number, accountId: number) =>
    apiRequest<void>('DELETE', `/api/budgets/${budgetId}/accounts/${accountId}`),

  // Entries
  getEntries: (budgetId: number, options?: { accountPath?: string; month?: string }) => {
    const params = new URLSearchParams();
    if (options?.accountPath) params.append('accountPath', options.accountPath);
    if (options?.month) params.append('month', options.month);
    const query = params.toString();
    return apiRequest<BudgetEntry[]>(`GET`, `/api/budgets/${budgetId}/entries${query ? `?${query}` : ''}`);
  },
  
  createEntry: (budgetId: number, data: CreateBudgetEntryData) =>
    apiRequest<BudgetEntry>('POST', `/api/budgets/${budgetId}/entries`, { ...data, budgetId }),
  
  createEntries: (budgetId: number, data: CreateBudgetEntryData[]) =>
    apiRequest<BudgetEntry[]>('POST', `/api/budgets/${budgetId}/entries`, data.map(d => ({ ...d, budgetId }))),
  
  updateEntry: (budgetId: number, accountPath: string, month: string, data: UpdateBudgetEntryData) =>
    apiRequest<BudgetEntry>('PUT', `/api/budgets/${budgetId}/entries`, { ...data, accountPath, month }),
  
  deleteEntry: (budgetId: number, accountPath: string, month: string) => {
    const params = new URLSearchParams();
    params.append('accountPath', accountPath);
    params.append('month', month);
    return apiRequest<void>('DELETE', `/api/budgets/${budgetId}/entries?${params.toString()}`);
  },
};

