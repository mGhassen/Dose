import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import {
  prefetchFinancialKPIs,
  prefetchRevenueChart,
  prefetchExpensesChart,
  prefetchProfitChart,
  prefetchCashFlowChart,
} from '@kit/hooks/server/prefetchDashboard';
import DashboardContent from './dashboard-content';

export default async function Page() {
  const queryClient = await prefetchFinancialKPIs();
  await prefetchRevenueChart(queryClient);
  await prefetchExpensesChart(queryClient);
  await prefetchProfitChart(queryClient);
  await prefetchCashFlowChart(queryClient);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  );
}
