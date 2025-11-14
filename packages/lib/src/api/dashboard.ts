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

export const dashboardApi = {
  getFinancialKPIs: (year: string) => apiRequest<FinancialKPIs>('GET', `/api/dashboard/kpis?year=${year}`),
  getRevenueChartData: (year: string) => 
    apiRequest<Array<{ month: string; revenue: number }>>('GET', `/api/dashboard/revenue-chart?year=${year}`),
  getExpensesChartData: (year: string) => 
    apiRequest<Array<{ month: string; expenses: number }>>('GET', `/api/dashboard/expenses-chart?year=${year}`),
  getProfitChartData: (year: string) => 
    apiRequest<Array<{ month: string; profit: number }>>('GET', `/api/dashboard/profit-chart?year=${year}`),
  getCashFlowChartData: (year: string) => 
    apiRequest<Array<{ month: string; inflows: number; outflows: number }>>('GET', `/api/dashboard/cash-flow-chart?year=${year}`),
};

