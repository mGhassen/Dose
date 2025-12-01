import { QueryClient } from '@tanstack/react-query';
import { makeQueryClient } from '@kit/lib/queryClient.server';
import { getAllMetadataEnums } from '@kit/lib/api/metadata-enums';
import { getEnumValues } from '@kit/lib/api/metadata-enums';

export async function prefetchMetadataEnums(queryClient?: QueryClient) {
  const qc = queryClient || makeQueryClient();
  await qc.prefetchQuery({
    queryKey: ['metadataEnums', 'all'],
    queryFn: getAllMetadataEnums,
  });
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

