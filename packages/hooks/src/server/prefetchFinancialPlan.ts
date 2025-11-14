import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { financialPlanApi } from '@kit/lib/api/financial-plan';

export async function prefetchFinancialPlan(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['financial-plan'],
    queryFn: () => financialPlanApi.getAll(),
  });
  return qc;
}

export async function prefetchFinancialPlanById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['financial-plan', id],
    queryFn: () => financialPlanApi.getById(id),
  });
  return qc;
}

export async function prefetchFinancialPlanByMonth(month: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['financial-plan', 'month', month],
    queryFn: () => financialPlanApi.getByMonth(month),
  });
  return qc;
}

