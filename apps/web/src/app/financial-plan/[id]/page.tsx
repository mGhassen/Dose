import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchFinancialPlanById } from '@kit/hooks';
import FinancialPlanDetailContent from './financial-plan-detail-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Financial Plan ID</h3>
          <p className="text-muted-foreground mb-4">The financial plan ID is invalid.</p>
        </div>
      </div>
    );
  }
  const queryClient = await prefetchFinancialPlanById(id);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FinancialPlanDetailContent params={params} />
    </HydrationBoundary>
  );
}
