import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchWorkingCapital } from '@kit/hooks';
import WorkingCapitalContent from './working-capital-content';

export default async function Page() {
  const queryClient = await prefetchWorkingCapital();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkingCapitalContent />
    </HydrationBoundary>
  );
}
