import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { prefetchSyncJob } from '@kit/hooks';
import { SyncJobDetailClient } from './sync-job-detail-client';

export default async function SyncJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const id = jobId != null ? Number(jobId) : NaN;
  const queryClient =
    !isNaN(id) && id > 0 ? await prefetchSyncJob(id) : makeQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SyncJobDetailClient />
    </HydrationBoundary>
  );
}
