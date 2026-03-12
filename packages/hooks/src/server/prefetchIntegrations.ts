import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { integrationsApi } from '@kit/lib';

async function hasAuthToken(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return !!cookieStore.get('access_token')?.value;
  } catch {
    return false;
  }
}

export async function prefetchIntegrations(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  if (!(await hasAuthToken())) return qc;
  try {
    await qc.prefetchQuery({
      queryKey: ['integrations'],
      queryFn: async () => {
        const data = await integrationsApi.getAll();
        return Array.isArray(data) ? data : [];
      },
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchAllSyncJobs(
  queryClient?: QueryClient,
  filters?: { status?: string; integration_id?: string; limit?: number; offset?: number }
) {
  const qc = queryClient || makeQueryClient();
  if (!(await hasAuthToken())) return qc;
  try {
    await qc.prefetchQuery({
      queryKey: ['sync-jobs', 'all', filters],
      queryFn: async () => {
        const res = await integrationsApi.getAllSyncJobs(filters);
        return res.jobs ?? [];
      },
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

export async function prefetchSyncJob(jobId: number, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  if (!(await hasAuthToken())) return qc;
  try {
    await qc.prefetchQuery({
      queryKey: ['sync-jobs', jobId],
      queryFn: () => integrationsApi.getSyncJob(jobId),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}
