import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchSubscription, prefetchSubscriptionProjections } from '@kit/hooks';
import SubscriptionDetailsContent from './subscription-details-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Subscription ID</h3>
          <p className="text-muted-foreground mb-4">
            The subscription ID is invalid.
          </p>
        </div>
      </div>
    );
  }

  const queryClient = await prefetchSubscription(id);
  await prefetchSubscriptionProjections(id, queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionDetailsContent subscriptionId={id} />
    </HydrationBoundary>
  );
}

