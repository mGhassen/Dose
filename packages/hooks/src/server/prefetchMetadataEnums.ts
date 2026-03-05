import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import {
  getAllMetadataEnums,
  getMetadataEnumById,
  getEnumValuesByEnumName,
} from '@kit/lib/api/metadata-enums';

export async function prefetchMetadataEnums(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['metadataEnums', 'all'],
      queryFn: getAllMetadataEnums,
    });
  } catch {
    // Prefetch failed - client will fetch
  }
  return qc;
}

/** Prefetch a single metadata enum by ID (for management/detail page). */
export async function prefetchMetadataEnum(id: number, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;
    if (!token) return qc;
  } catch {
    return qc;
  }
  try {
    await qc.prefetchQuery({
      queryKey: ['metadataEnums', 'byId', id],
      queryFn: () => getMetadataEnumById(id),
    });
  } catch {
    // Client will retry
  }
  return qc;
}

/**
 * Prefetch enum values by enum name (same as useMetadataEnum(enumName)).
 * Server-safe: uses apiRequest with cookie auth. Use in layout/page like other prefetches.
 */
export async function prefetchEnumValues(enumName: string, queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  try {
    await qc.prefetchQuery({
      queryKey: ['metadataEnums', enumName],
      queryFn: () => getEnumValuesByEnumName(enumName),
    });
  } catch {
    // Client will fetch
  }
  return qc;
}

/** Alias for prefetchEnumValues – prefetch metadata enum values by name. */
export const prefetchMetadataEnumByName = prefetchEnumValues;

