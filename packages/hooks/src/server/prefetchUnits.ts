import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { getUnits, getUnitById } from '@kit/lib/api/units';

export async function prefetchUnits(queryClient?: QueryClient, params?: { dimension?: string }) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['units', params],
      queryFn: () => getUnits(params),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchUnit(id: number, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['units', id],
      queryFn: () => getUnitById(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}
