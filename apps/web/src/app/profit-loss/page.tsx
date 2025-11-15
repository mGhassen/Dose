import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchProfitLoss } from '@kit/hooks/server/prefetchProfitLoss';
import ProfitLossContent from './profit-loss-content';

export default async function ProfitLossPage() {
  // Prefetch data on server - data will be available immediately on page load
  const queryClient = await prefetchProfitLoss();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfitLossContent />
    </HydrationBoundary>
  );
}
