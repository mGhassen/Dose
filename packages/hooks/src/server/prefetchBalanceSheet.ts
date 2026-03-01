import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { balanceSheetApi } from '@kit/lib/api/balance-sheet';

export async function prefetchBalanceSheet(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['balance-sheet'],
      queryFn: () => balanceSheetApi.getAll(),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchBalanceSheetById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['balance-sheet', id],
      queryFn: () => balanceSheetApi.getById(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchBalanceSheetByMonth(month: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['balance-sheet', 'month', month],
      queryFn: () => balanceSheetApi.getByMonth(month),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

