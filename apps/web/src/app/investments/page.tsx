import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchInvestments } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import InvestmentsContent from './investments-content';

export default async function Page() {
  const queryClient = await prefetchInvestments();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <InvestmentsContent />
      </AppLayout>
    </HydrationBoundary>
  );
}
