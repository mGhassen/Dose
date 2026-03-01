import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLoans } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import LoansContent from './loans-content';

export default async function Page() {
  const queryClient = await prefetchLoans();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <LoansContent />
      </AppLayout>
    </HydrationBoundary>
  );
}
