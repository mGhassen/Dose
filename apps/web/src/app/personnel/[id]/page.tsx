import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchPersonnelById, prefetchVariables } from '@kit/hooks';
import PersonnelDetailPage from './personnel-detail-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Personnel ID</h3>
          <p className="text-muted-foreground mb-4">The personnel ID is invalid.</p>
        </div>
      </div>
    );
  }
  const queryClient = await prefetchPersonnelById(id);
  await prefetchVariables(queryClient);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PersonnelDetailPage params={params} />
    </HydrationBoundary>
  );
}
