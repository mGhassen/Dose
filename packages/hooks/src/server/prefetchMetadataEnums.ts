import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { getAllMetadataEnums, getMetadataEnumById } from '@kit/lib/api/metadata-enums';
import { getEnumValues } from '@kit/lib/api/metadata-enums';

export async function prefetchMetadataEnums(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['metadataEnums', 'all'],
    queryFn: getAllMetadataEnums,
  });
  return qc;
}

export async function prefetchMetadataEnum(id: number, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  
  // Check if we have an auth token before prefetching
  // If no token, skip prefetch and let client handle it
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    
    if (!token) {
      // No token available, skip prefetch - client will handle it
      return qc;
    }
  } catch {
    // Cookies not available, skip prefetch
    return qc;
  }
  
  // Token exists, proceed with prefetch
  try {
    await qc.prefetchQuery({
      queryKey: ['metadataEnums', 'byId', id],
      queryFn: () => getMetadataEnumById(id),
    });
  } catch (error) {
    // Prefetch failed (e.g., no auth), but don't throw - let client retry
    console.warn('[prefetchMetadataEnum] Prefetch failed, client will retry:', error);
  }
  
  return qc;
}

export async function prefetchEnumValues(enumName: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['metadataEnums', enumName],
    queryFn: async () => {
      const response = await getEnumValues(enumName);
      return response || [];
    },
  });
  return qc;
}

