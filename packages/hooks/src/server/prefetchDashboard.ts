import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { dashboardApi } from '@kit/lib/api/dashboard';

export async function prefetchFinancialKPIs(year: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'kpis', year],
    queryFn: () => dashboardApi.getFinancialKPIs(year),
  });
  return qc;
}

export async function prefetchRevenueChart(year: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'revenue-chart', year],
    queryFn: () => dashboardApi.getRevenueChartData(year),
  });
  return qc;
}

export async function prefetchExpensesChart(year: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'expenses-chart', year],
    queryFn: () => dashboardApi.getExpensesChartData(year),
  });
  return qc;
}

export async function prefetchProfitChart(year: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'profit-chart', year],
    queryFn: () => dashboardApi.getProfitChartData(year),
  });
  return qc;
}

export async function prefetchCashFlowChart(year: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'cash-flow-chart', year],
    queryFn: () => dashboardApi.getCashFlowChartData(year),
  });
  return qc;
}

