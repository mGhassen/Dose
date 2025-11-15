// React Query hooks for Budgets

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { budgetsApi } from '@kit/lib/api/budgets';
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
  BudgetWithData
} from '@kit/types';

export function useBudgets(options?: { fiscalYear?: string; includeAccounts?: boolean; includeEntries?: boolean } & Omit<UseQueryOptions<Budget[]>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['budgets', options?.fiscalYear, options?.includeAccounts, options?.includeEntries],
    queryFn: () => budgetsApi.getAll(options),
    ...options,
  });
}

export function useBudgetById(id: number, options?: { includeAccounts?: boolean; includeEntries?: boolean } & Omit<UseQueryOptions<BudgetWithData>, 'queryKey' | 'queryFn'>) {
  return useQuery({
    queryKey: ['budgets', id, options?.includeAccounts, options?.includeEntries],
    queryFn: () => budgetsApi.getById(id, options),
    enabled: !!id,
    ...options,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateBudgetData) => budgetsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBudgetData }) => 
      budgetsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', id] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => budgetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
}

// Account hooks
export function useBudgetAccounts(budgetId: number) {
  return useQuery({
    queryKey: ['budgets', budgetId, 'accounts'],
    queryFn: () => budgetsApi.getAccounts(budgetId),
    enabled: !!budgetId,
  });
}

export function useCreateBudgetAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, data }: { budgetId: number; data: CreateBudgetAccountData }) => 
      budgetsApi.createAccount(budgetId, data),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

export function useUpdateBudgetAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, accountId, data }: { budgetId: number; accountId: number; data: UpdateBudgetAccountData }) => 
      budgetsApi.updateAccount(budgetId, accountId, data),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

export function useDeleteBudgetAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, accountId }: { budgetId: number; accountId: number }) => 
      budgetsApi.deleteAccount(budgetId, accountId),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

// Entry hooks
export function useBudgetEntries(budgetId: number, options?: { accountPath?: string; month?: string }) {
  return useQuery({
    queryKey: ['budgets', budgetId, 'entries', options?.accountPath, options?.month],
    queryFn: () => budgetsApi.getEntries(budgetId, options),
    enabled: !!budgetId,
  });
}

export function useCreateBudgetEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, data }: { budgetId: number; data: CreateBudgetEntryData }) => 
      budgetsApi.createEntry(budgetId, data),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

export function useCreateBudgetEntries() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, data }: { budgetId: number; data: CreateBudgetEntryData[] }) => 
      budgetsApi.createEntries(budgetId, data),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

export function useUpdateBudgetEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, accountPath, month, data }: { budgetId: number; accountPath: string; month: string; data: UpdateBudgetEntryData }) => 
      budgetsApi.updateEntry(budgetId, accountPath, month, data),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

export function useDeleteBudgetEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ budgetId, accountPath, month }: { budgetId: number; accountPath: string; month: string }) => 
      budgetsApi.deleteEntry(budgetId, accountPath, month),
    onSuccess: (_, { budgetId }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId, 'entries'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', budgetId] });
    },
  });
}

