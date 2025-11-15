import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchSubscription } from '@kit/hooks';
import SubscriptionDetailsContent from './subscription-details-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  // Validate ID
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

  // Prefetch data on server
  const queryClient = await prefetchSubscription(id);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionDetailsContent subscriptionId={id} />
    </HydrationBoundary>
  );
}

