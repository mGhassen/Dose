import { apiRequest } from './api';

export interface FinancialKPIs {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  workingCapital: number;
  totalDebt: number;
  personnelCost: number;
  grossProfit: number;
}

export interface DashboardDateParams {
  year?: string;
  startDate?: string;
  endDate?: string;
}

function buildDateParams(params: DashboardDateParams): string {
  const searchParams = new URLSearchParams();
  if (params.year) searchParams.set('year', params.year);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  return searchParams.toString() ? `?${searchParams.toString()}` : '';
}

export const dashboardApi = {
  getFinancialKPIs: (params: string | DashboardDateParams) => {
    const qs = typeof params === 'string' ? `?year=${params}` : buildDateParams(params);
    return apiRequest<FinancialKPIs>('GET', `/api/dashboard/kpis${qs}`);
  },
  getRevenueChartData: (params: string | DashboardDateParams) => {
    const qs = typeof params === 'string' ? `?year=${params}` : buildDateParams(params);
    return apiRequest<Array<{ month: string; revenue: number }>>('GET', `/api/dashboard/revenue-chart${qs}`);
  },
  getExpensesChartData: (params: string | DashboardDateParams) => {
    const qs = typeof params === 'string' ? `?year=${params}` : buildDateParams(params);
    return apiRequest<Array<{ month: string; expenses: number }>>('GET', `/api/dashboard/expenses-chart${qs}`);
  },
  getProfitChartData: (params: string | DashboardDateParams) => {
    const qs = typeof params === 'string' ? `?year=${params}` : buildDateParams(params);
    return apiRequest<Array<{ month: string; profit: number }>>('GET', `/api/dashboard/profit-chart${qs}`);
  },
  getCashFlowChartData: (params: string | DashboardDateParams) => {
    const qs = typeof params === 'string' ? `?year=${params}` : buildDateParams(params);
    return apiRequest<Array<{ month: string; inflows: number; outflows: number; cashFlow?: number; balance?: number }>>('GET', `/api/dashboard/cash-flow-chart${qs}`);
  },
};

