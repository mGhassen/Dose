import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchPersonnel } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import PersonnelContent from './personnel-content';

export default async function Page() {
  const queryClient = await prefetchPersonnel(undefined, { page: 1, limit: 1000 });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <PersonnelContent />
      </AppLayout>
    </HydrationBoundary>
  );
}
