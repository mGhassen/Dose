import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { expensesApi } from '@kit/lib/api/expenses';

export async function prefetchExpenses(queryClient?: QueryClient, params?: { page?: number; limit?: number; category?: string; month?: string; year?: string }) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesApi.getAll(params),
  });
  return qc;
}

export async function prefetchExpense(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['expenses', id],
    queryFn: () => expensesApi.getById(id),
  });
  return qc;
}

