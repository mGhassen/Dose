import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLeasing } from '@kit/hooks';
import LeasingContent from './leasing-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchLeasing();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LeasingContent />
    </HydrationBoundary>
  );
}
