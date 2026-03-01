import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLeasing } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import LeasingContent from './leasing-content';

export default async function Page() {
  const queryClient = await prefetchLeasing();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <LeasingContent />
      </AppLayout>
    </HydrationBoundary>
  );
}
