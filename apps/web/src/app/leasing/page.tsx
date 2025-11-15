import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLeasing } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import LeasingContent from './leasing-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchLeasing();

  return (
    <AppLayout>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <LeasingContent />
      </HydrationBoundary>
    </AppLayout>
  );
}
