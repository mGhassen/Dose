import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { loansApi } from '@kit/lib/api/loans';

export async function prefetchLoans(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['loans'],
    queryFn: () => loansApi.getAll(),
  });
  return qc;
}

export async function prefetchLoan(id: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id),
  });
  return qc;
}

export async function prefetchLoanSchedule(loanId: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['loans', loanId, 'schedule'],
    queryFn: () => loansApi.getSchedule(loanId),
  });
  return qc;
}

