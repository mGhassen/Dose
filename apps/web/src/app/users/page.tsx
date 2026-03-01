import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchUsers } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import UsersContent from './users-content';

export default async function Page() {
  const queryClient = await prefetchUsers();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <UsersContent />
      </AppLayout>
    </HydrationBoundary>
  );
}
