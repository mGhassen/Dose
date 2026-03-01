import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLeasingById } from '@kit/hooks';
import LeasingDetailPageClient from './leasing-detail-page';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Leasing ID</h3>
          <p className="text-muted-foreground mb-4">The leasing ID is invalid.</p>
        </div>
      </div>
    );
  }
  const queryClient = await prefetchLeasingById(id);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LeasingDetailPageClient params={params} />
    </HydrationBoundary>
  );
}
