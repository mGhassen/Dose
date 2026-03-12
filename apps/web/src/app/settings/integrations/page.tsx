import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchIntegrations } from '@kit/hooks';
import { IntegrationsPageClient } from './integrations-page-client';

export default async function IntegrationsPage() {
  const queryClient = await prefetchIntegrations();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <IntegrationsPageClient />
    </HydrationBoundary>
  );
}
