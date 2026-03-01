import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchProfitLossByMonth } from '@kit/hooks';
import ProfitLossDetailContent from './profit-loss-detail-content';

interface PageProps {
  params: Promise<{ month: string }>;
}

export default async function Page({ params }: PageProps) {
  const { month } = await params;
  if (!month || month.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Month</h3>
          <p className="text-muted-foreground mb-4">The month parameter is invalid.</p>
        </div>
      </div>
    );
  }
  const queryClient = await prefetchProfitLossByMonth(month);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfitLossDetailContent params={params} />
    </HydrationBoundary>
  );
}
