import { useQuery } from '@tanstack/react-query';
import { financialStatementApi, type IncomeStatementData } from '@kit/lib';

export function useIncomeStatement(params?: { year?: string; quarter?: string; month?: string }) {
  return useQuery({
    queryKey: ['income-statement', params],
    queryFn: async () => {
      return await financialStatementApi.getIncomeStatement(params);
    },
  });
}



