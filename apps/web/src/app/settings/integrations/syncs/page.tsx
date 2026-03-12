import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchIntegrations, prefetchAllSyncJobs } from '@kit/hooks';
import { SyncsPageClient } from './syncs-page-client';

export default async function SyncActivityPage() {
  const queryClient = await prefetchIntegrations();
  await prefetchAllSyncJobs(queryClient, {
    status: undefined,
    integration_id: undefined,
    limit: 50,
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SyncsPageClient />
    </HydrationBoundary>
  );
}
