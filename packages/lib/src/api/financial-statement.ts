import { apiRequest } from './api';
import type { ExpenseCategory, SalesType } from '@kit/types';

export interface IncomeStatementData {
  sales: {
    byType: Record<SalesType, { total: number; items: Array<{ id: number; date: string; amount: number; description?: string }> }>;
    total: number;
  };
  expenses: {
    byCategory: Record<ExpenseCategory | string, { total: number; items: Array<{ id: number; name: string; amount: number; date: string; description?: string }> }>;
    total: number;
  };
  personnel: {
    totalSalary: number;
    totalCharges: number;
    totalCost: number;
    headcount: number;
    items: Array<{ id: number; name: string; salary: number; charges: number; total: number }>;
  };
  leasing: {
    total: number;
    items: Array<{ id: number; name: string; amount: number }>;
  };
  depreciation: {
    total: number;
    items: Array<{ id: number; investmentName: string; amount: number }>;
  };
  interest: {
    total: number;
    items: Array<{ id: number; loanName: string; amount: number; date: string }>;
  };
  taxes: {
    total: number;
    items: Array<{ id: number; name: string; amount: number }>;
  };
  costOfGoodsSold: number;
  totalRevenue: number;
  grossProfit: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  netProfit: number;
}

export const financialStatementApi = {
  getIncomeStatement: (params?: { year?: string; quarter?: string; month?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.year) searchParams.append('year', params.year);
    if (params?.quarter) searchParams.append('quarter', params.quarter);
    if (params?.month) searchParams.append('month', params.month);
    const query = searchParams.toString();
    return apiRequest<IncomeStatementData>(`GET`, `/api/financial-statement/income-statement${query ? `?${query}` : ''}`);
  },
};



