import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { profitLossApi } from '@kit/lib/api/profit-loss';

export async function prefetchProfitLoss(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['profit-loss'],
      queryFn: () => profitLossApi.getAll(),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchProfitLossById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['profit-loss', id],
      queryFn: () => profitLossApi.getById(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchProfitLossByMonth(month: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['profit-loss', 'month', month],
      queryFn: () => profitLossApi.getByMonth(month),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

