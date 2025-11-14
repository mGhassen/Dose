// React Query hooks for Expenses

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '@kit/lib';
import type { 
  Expense, 
  CreateExpenseData, 
  UpdateExpenseData,
  ExpenseProjection,
  AnnualExpenseBudget,
  ExpenseProjectionSummary
} from '@kit/types';

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.getAll,
  });
}

export function useExpenseById(id: string) {
  return useQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.getById(id),
    enabled: !!id,
  });
}

export function useExpensesByCategory(category: string) {
  return useQuery({
    queryKey: ['expenses', 'category', category],
    queryFn: () => expensesApi.getByCategory(category),
    enabled: !!category,
  });
}

export function useExpensesByMonth(month: string) {
  return useQuery({
    queryKey: ['expenses', 'month', month],
    queryFn: () => expensesApi.getByMonth(month),
    enabled: !!month,
  });
}

export function useExpenseProjections(year: string) {
  return useQuery({
    queryKey: ['expenses', 'projections', year],
    queryFn: () => expensesApi.getProjections(year),
    enabled: !!year,
  });
}

export function useAnnualExpenseBudget(year: string) {
  return useQuery({
    queryKey: ['expenses', 'annual-budget', year],
    queryFn: () => expensesApi.getAnnualBudget(year),
    enabled: !!year,
  });
}

export function useExpenseProjectionSummary(year: string) {
  return useQuery({
    queryKey: ['expenses', 'projection-summary', year],
    queryFn: () => expensesApi.getProjectionSummary(year),
    enabled: !!year,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseData }) => 
      expensesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses', variables.id] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

