import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { investmentsApi } from '@kit/lib/api/investments';

export async function prefetchInvestments(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['investments'],
    queryFn: () => investmentsApi.getAll(),
  });
  return qc;
}

export async function prefetchInvestment(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['investments', id],
    queryFn: () => investmentsApi.getById(id),
  });
  return qc;
}

export async function prefetchInvestmentDepreciation(investmentId: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['investments', investmentId, 'depreciation'],
    queryFn: () => investmentsApi.getDepreciation(investmentId),
  });
  return qc;
}

