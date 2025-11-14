import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchVariables } from '@kit/hooks';
import VariablesContent from './variables-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchVariables();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VariablesContent />
    </HydrationBoundary>
  );
}
