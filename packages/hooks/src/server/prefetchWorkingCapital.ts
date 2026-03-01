import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { workingCapitalApi } from '@kit/lib/api/working-capital';

export async function prefetchWorkingCapital(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['working-capital'],
      queryFn: () => workingCapitalApi.getAll(),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchWorkingCapitalById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['working-capital', id],
      queryFn: () => workingCapitalApi.getById(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchWorkingCapitalByMonth(month: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['working-capital', 'month', month],
      queryFn: () => workingCapitalApi.getByMonth(month),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

