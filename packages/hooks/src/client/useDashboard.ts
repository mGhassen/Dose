// React Query hooks for Dashboard

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type FinancialKPIs, type DashboardDateParams } from '@kit/lib';

type DateParams = string | DashboardDateParams;

export function useFinancialKPIs(params: DateParams) {
  const key = typeof params === 'string' ? params : `${params.startDate}-${params.endDate}`;
  return useQuery<FinancialKPIs>({
    queryKey: ['dashboard', 'kpis', key],
    queryFn: () => dashboardApi.getFinancialKPIs(params),
    enabled: !!params && (typeof params === 'string' ? true : !!(params.year || (params.startDate && params.endDate))),
  });
}

export function useRevenueChart(params: DateParams) {
  const key = typeof params === 'string' ? params : `${params.startDate}-${params.endDate}`;
  return useQuery<Array<{ month: string; revenue: number }>>({
    queryKey: ['dashboard', 'revenue-chart', key],
    queryFn: () => dashboardApi.getRevenueChartData(params),
    enabled: !!params && (typeof params === 'string' ? true : !!(params.year || (params.startDate && params.endDate))),
  });
}

export function useExpensesChart(params: DateParams) {
  const key = typeof params === 'string' ? params : `${params.startDate}-${params.endDate}`;
  return useQuery<Array<{ month: string; expenses: number }>>({
    queryKey: ['dashboard', 'expenses-chart', key],
    queryFn: () => dashboardApi.getExpensesChartData(params),
    enabled: !!params && (typeof params === 'string' ? true : !!(params.year || (params.startDate && params.endDate))),
  });
}

export function useProfitChart(params: DateParams) {
  const key = typeof params === 'string' ? params : `${params.startDate}-${params.endDate}`;
  return useQuery<Array<{ month: string; profit: number }>>({
    queryKey: ['dashboard', 'profit-chart', key],
    queryFn: () => dashboardApi.getProfitChartData(params),
    enabled: !!params && (typeof params === 'string' ? true : !!(params.year || (params.startDate && params.endDate))),
  });
}

export function useCashFlowChart(params: DateParams) {
  const key = typeof params === 'string' ? params : `${params.startDate}-${params.endDate}`;
  return useQuery<Array<{ month: string; inflows: number; outflows: number; cashFlow?: number; balance?: number }>>({
    queryKey: ['dashboard', 'cash-flow-chart', key],
    queryFn: () => dashboardApi.getCashFlowChartData(params),
    enabled: !!params && (typeof params === 'string' ? true : !!(params.year || (params.startDate && params.endDate))),
  });
}

