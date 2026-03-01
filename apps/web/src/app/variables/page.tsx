import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchVariables } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import VariablesContent from './variables-content';

export default async function Page() {
  const queryClient = await prefetchVariables();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <VariablesContent />
      </AppLayout>
    </HydrationBoundary>
  );
}
