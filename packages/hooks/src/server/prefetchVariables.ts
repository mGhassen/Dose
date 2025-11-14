import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { variablesApi } from '@kit/lib/api/variables';

export async function prefetchVariables(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['variables'],
    queryFn: () => variablesApi.getAll(),
  });
  return qc;
}

export async function prefetchVariable(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['variables', id],
    queryFn: () => variablesApi.getById(id),
  });
  return qc;
}

