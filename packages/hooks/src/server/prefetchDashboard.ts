import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { dashboardApi } from '@kit/lib/api/dashboard';
import { getSelectedYearFromCookies } from '@kit/lib/year-utils';

/**
 * Get the selected year from cookies, or use provided year, or default to current year
 */
async function getYear(year?: string): Promise<string> {
  if (year) return year;
  return getSelectedYearFromCookies();
}

export async function prefetchFinancialKPIs(year?: string, queryClient?: QueryClient) {
  const selectedYear = await getYear(year);
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'kpis', selectedYear],
    queryFn: () => dashboardApi.getFinancialKPIs(selectedYear),
  });
  return qc;
}

export async function prefetchRevenueChart(year?: string, queryClient?: QueryClient) {
  const selectedYear = await getYear(year);
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'revenue-chart', selectedYear],
    queryFn: () => dashboardApi.getRevenueChartData(selectedYear),
  });
  return qc;
}

export async function prefetchExpensesChart(year?: string, queryClient?: QueryClient) {
  const selectedYear = await getYear(year);
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'expenses-chart', selectedYear],
    queryFn: () => dashboardApi.getExpensesChartData(selectedYear),
  });
  return qc;
}

export async function prefetchProfitChart(year?: string, queryClient?: QueryClient) {
  const selectedYear = await getYear(year);
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'profit-chart', selectedYear],
    queryFn: () => dashboardApi.getProfitChartData(selectedYear),
  });
  return qc;
}

export async function prefetchCashFlowChart(year?: string, queryClient?: QueryClient) {
  const selectedYear = await getYear(year);
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['dashboard', 'cash-flow-chart', selectedYear],
    queryFn: () => dashboardApi.getCashFlowChartData(selectedYear),
  });
  return qc;
}

