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

export function useExpenses(params?: { page?: number; limit?: number; category?: string; month?: string; year?: string }) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: async () => {
      try {
        const result = await expensesApi.getAll(params);
        // Return full paginated response
        if (result && result !== null && typeof result === 'object' && 'data' in result && 'pagination' in result) {
          return result;
        }
        // If result is already an array (fallback for backward compatibility)
        if (Array.isArray(result)) {
          return {
            data: result,
            pagination: {
              page: 1,
              limit: result.length,
              total: result.length,
              totalPages: 1,
              hasMore: false,
            },
          };
        }
        console.warn('[useExpenses] Unexpected response format:', result);
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      } catch (error) {
        console.error('[useExpenses] Error fetching expenses:', error);
        throw error;
      }
    },
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
    queryFn: async () => {
      const result = await expensesApi.getByCategory(category);
      // Extract data from paginated response
      return result?.data || [];
    },
    enabled: !!category,
  });
}

export function useExpensesByMonth(month: string) {
  return useQuery({
    queryKey: ['expenses', 'month', month],
    queryFn: async () => {
      const result = await expensesApi.getByMonth(month);
      // Extract data from paginated response
      return result?.data || [];
    },
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

