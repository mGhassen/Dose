import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLoans } from '@kit/hooks';
import LoansContent from './loans-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchLoans();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LoansContent />
    </HydrationBoundary>
  );
}
