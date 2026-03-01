import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchWorkingCapitalById } from '@kit/hooks';
import WorkingCapitalDetailContent from './working-capital-detail-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Working Capital ID</h3>
          <p className="text-muted-foreground mb-4">The working capital ID is invalid.</p>
        </div>
      </div>
    );
  }
  const queryClient = await prefetchWorkingCapitalById(id);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <WorkingCapitalDetailContent params={params} />
    </HydrationBoundary>
  );
}
