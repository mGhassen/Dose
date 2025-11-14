import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchInvestments } from '@kit/hooks';
import InvestmentsContent from './investments-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchInvestments();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InvestmentsContent />
    </HydrationBoundary>
  );
}
