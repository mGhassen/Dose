import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { variablesApi } from '@kit/lib/api/variables';

export async function prefetchVariables(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['variables'],
      queryFn: async () => {
        const result = await variablesApi.getAll();
        return result?.data ?? [];
      },
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchVariable(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['variables', id],
      queryFn: () => variablesApi.getById(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

