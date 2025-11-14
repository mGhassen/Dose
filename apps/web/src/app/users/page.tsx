import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchUsers } from '@smartlogbook/hooks';
import UsersContent from './users-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchUsers();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersContent />
    </HydrationBoundary>
  );
}
