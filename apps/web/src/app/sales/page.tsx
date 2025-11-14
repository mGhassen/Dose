import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchSales } from '@kit/hooks';
import SalesContent from './sales-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchSales();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SalesContent />
    </HydrationBoundary>
  );
}
