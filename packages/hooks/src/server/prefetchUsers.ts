import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@smartlogbook/lib/queryClient.server';
import { usersApi } from '@smartlogbook/lib/api/users';

export async function prefetchUsers(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getUsers(),
  });
  return qc;
}

export async function prefetchUser(id: number, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['users', id],
    queryFn: () => usersApi.getUser(id),
  });
  return qc;
}

