import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { subscriptionsApi } from '@kit/lib/api/subscriptions';

export async function prefetchSubscriptions(queryClient?: QueryClient, params?: { page?: number; limit?: number; category?: string; isActive?: boolean }) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['subscriptions', params],
    queryFn: () => subscriptionsApi.getAll(params),
  });
  return qc;
}

export async function prefetchSubscription(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['subscriptions', id],
    queryFn: () => subscriptionsApi.getById(id),
  });
  return qc;
}

