import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchPersonnel } from '@kit/hooks';
import PersonnelContent from './personnel-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchPersonnel();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PersonnelContent />
    </HydrationBoundary>
  );
}
