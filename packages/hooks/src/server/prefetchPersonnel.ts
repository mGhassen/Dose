import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { personnelApi } from '@kit/lib/api/personnel';

export async function prefetchPersonnel(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['personnel'],
    queryFn: () => personnelApi.getAll(),
  });
  return qc;
}

export async function prefetchPersonnelById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['personnel', id],
    queryFn: () => personnelApi.getById(id),
  });
  return qc;
}

