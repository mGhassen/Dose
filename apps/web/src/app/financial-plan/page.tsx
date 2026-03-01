import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchFinancialPlan } from '@kit/hooks';
import FinancialPlanContent from './financial-plan-content';

export default async function Page() {
  const queryClient = await prefetchFinancialPlan();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FinancialPlanContent />
    </HydrationBoundary>
  );
}
