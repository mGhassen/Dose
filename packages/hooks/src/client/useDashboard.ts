// React Query hooks for Dashboard

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, type FinancialKPIs } from '@kit/lib';

export function useFinancialKPIs(year: string) {
  return useQuery<FinancialKPIs>({
    queryKey: ['dashboard', 'kpis', year],
    queryFn: () => dashboardApi.getFinancialKPIs(year),
    enabled: !!year,
  });
}

export function useRevenueChart(year: string) {
  return useQuery<Array<{ month: string; revenue: number }>>({
    queryKey: ['dashboard', 'revenue-chart', year],
    queryFn: () => dashboardApi.getRevenueChartData(year),
    enabled: !!year,
  });
}

export function useExpensesChart(year: string) {
  return useQuery<Array<{ month: string; expenses: number }>>({
    queryKey: ['dashboard', 'expenses-chart', year],
    queryFn: () => dashboardApi.getExpensesChartData(year),
    enabled: !!year,
  });
}

export function useProfitChart(year: string) {
  return useQuery<Array<{ month: string; profit: number }>>({
    queryKey: ['dashboard', 'profit-chart', year],
    queryFn: () => dashboardApi.getProfitChartData(year),
    enabled: !!year,
  });
}

export function useCashFlowChart(year: string) {
  return useQuery<Array<{ month: string; inflows: number; outflows: number }>>({
    queryKey: ['dashboard', 'cash-flow-chart', year],
    queryFn: () => dashboardApi.getCashFlowChartData(year),
    enabled: !!year,
  });
}

