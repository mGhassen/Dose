import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { leasingApi } from '@kit/lib/api/leasing';

export async function prefetchLeasing(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['leasing'],
    queryFn: () => leasingApi.getAll(),
  });
  return qc;
}

export async function prefetchLeasingById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['leasing', id],
    queryFn: () => leasingApi.getById(id),
  });
  return qc;
}

