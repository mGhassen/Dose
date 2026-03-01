import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchCashFlowById } from '@kit/hooks';
import CashFlowDetailContent from './cash-flow-detail-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Cash Flow ID</h3>
          <p className="text-muted-foreground mb-4">The cash flow ID is invalid.</p>
        </div>
      </div>
    );
  }
  const queryClient = await prefetchCashFlowById(id);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CashFlowDetailContent params={params} />
    </HydrationBoundary>
  );
}
