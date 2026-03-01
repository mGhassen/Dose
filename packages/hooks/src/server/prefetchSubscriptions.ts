import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { subscriptionsApi } from '@kit/lib/api/subscriptions';

async function hasAuthToken(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return !!cookieStore.get('access_token')?.value;
  } catch {
    return false;
  }
}

export async function prefetchSubscriptions(queryClient?: QueryClient, params?: { page?: number; limit?: number; category?: string; isActive?: boolean }) {
  const qc = queryClient || makeQueryClient();
  if (!(await hasAuthToken())) return qc;
  try {
    await qc.prefetchQuery({
      queryKey: ['subscriptions', params],
      queryFn: () => subscriptionsApi.getAll(params),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchSubscription(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  if (!(await hasAuthToken())) return qc;
  try {
    await qc.prefetchQuery({
      queryKey: ['subscriptions', id],
      queryFn: () => subscriptionsApi.getById(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchSubscriptionProjections(
  subscriptionId: string,
  queryClient?: QueryClient,
  startMonth?: string,
  endMonth?: string
) {
  const qc = queryClient || makeQueryClient();
  if (!(await hasAuthToken())) return qc;
  try {
    await qc.prefetchQuery({
      queryKey: ['subscriptions', subscriptionId, 'projections', startMonth, endMonth],
      queryFn: () => subscriptionsApi.getProjections(subscriptionId, startMonth, endMonth),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

