import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { salesApi } from '@kit/lib/api/sales';

export async function prefetchSales(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getAll(),
  });
  return qc;
}

export async function prefetchSale(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['sales', id],
    queryFn: () => salesApi.getById(id),
  });
  return qc;
}

