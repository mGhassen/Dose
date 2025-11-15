import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchSales } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import SalesContent from './sales-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchSales();

  return (
    <AppLayout>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <SalesContent />
      </HydrationBoundary>
    </AppLayout>
  );
}
