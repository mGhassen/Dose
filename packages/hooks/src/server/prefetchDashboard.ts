import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { dashboardApi } from '@kit/lib/api/dashboard';
import { getDateRangeForPreset } from '@kit/lib/date-periods';

function getDefaultParams() {
  const range = getDateRangeForPreset('this_year');
  return { startDate: range.startDate, endDate: range.endDate };
}

export async function prefetchFinancialKPIs(queryClient?: QueryClient) {
  const params = getDefaultParams();
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'kpis', `${params.startDate}-${params.endDate}`],
    queryFn: () => dashboardApi.getFinancialKPIs(params),
  });
  return qc;
}

export async function prefetchRevenueChart(queryClient?: QueryClient) {
  const params = getDefaultParams();
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'revenue-chart', `${params.startDate}-${params.endDate}`],
    queryFn: () => dashboardApi.getRevenueChartData(params),
  });
  return qc;
}

export async function prefetchExpensesChart(queryClient?: QueryClient) {
  const params = getDefaultParams();
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'expenses-chart', `${params.startDate}-${params.endDate}`],
    queryFn: () => dashboardApi.getExpensesChartData(params),
  });
  return qc;
}

export async function prefetchProfitChart(queryClient?: QueryClient) {
  const params = getDefaultParams();
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'profit-chart', `${params.startDate}-${params.endDate}`],
    queryFn: () => dashboardApi.getProfitChartData(params),
  });
  return qc;
}

export async function prefetchCashFlowChart(queryClient?: QueryClient) {
  const params = getDefaultParams();
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'cash-flow-chart', `${params.startDate}-${params.endDate}`],
    queryFn: () => dashboardApi.getCashFlowChartData(params),
  });
  return qc;
}

