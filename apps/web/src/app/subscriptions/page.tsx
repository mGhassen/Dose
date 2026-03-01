import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchSubscriptions } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import SubscriptionsContent from './subscriptions-content';

export default async function Page() {
  const queryClient = await prefetchSubscriptions(undefined, { page: 1, limit: 1000 });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <SubscriptionsContent />
      </AppLayout>
    </HydrationBoundary>
  );
}

