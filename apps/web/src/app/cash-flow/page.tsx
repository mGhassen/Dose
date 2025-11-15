import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchCashFlow } from '@kit/hooks/server/prefetchCashFlow';
import CashFlowContent from './cash-flow-content';

export default async function CashFlowPage() {
  // Prefetch data on server - data will be available immediately on page load
  const queryClient = await prefetchCashFlow();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CashFlowContent />
    </HydrationBoundary>
  );
}
