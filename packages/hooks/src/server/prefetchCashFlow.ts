import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { cashFlowApi } from '@kit/lib/api/cash-flow';

export async function prefetchCashFlow(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['cash-flow'],
    queryFn: () => cashFlowApi.getAll(),
  });
  return qc;
}

export async function prefetchCashFlowById(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['cash-flow', id],
    queryFn: () => cashFlowApi.getById(id),
  });
  return qc;
}

export async function prefetchCashFlowByMonth(month: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['cash-flow', 'month', month],
    queryFn: () => cashFlowApi.getByMonth(month),
  });
  return qc;
}

export async function prefetchCashFlowProjection(startMonth: string, endMonth: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['cash-flow', 'projection', startMonth, endMonth],
    queryFn: () => cashFlowApi.getProjection(startMonth, endMonth),
  });
  return qc;
}

