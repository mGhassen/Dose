import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { usersApi } from '@kit/lib/api/users';

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
  try {
    await qc.prefetchQuery({
      queryKey: ['users', id],
      queryFn: () => usersApi.getUser(id),
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

