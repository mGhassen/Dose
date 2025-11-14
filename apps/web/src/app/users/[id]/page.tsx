import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchUser } from '@kit/hooks/server/prefetchUsers';
import UserDetailsContent from './user-details-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const userId = Number(id);

  // Validate ID
  if (isNaN(userId) || userId <= 0) {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid User ID</h3>
          <p className="text-muted-foreground mb-4">
            The user ID is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Prefetch data on server
  const queryClient = await prefetchUser(userId);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserDetailsContent userId={userId} />
    </HydrationBoundary>
  );
}
