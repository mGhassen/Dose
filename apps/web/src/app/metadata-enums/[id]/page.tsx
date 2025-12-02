import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchMetadataEnum } from '@kit/hooks';
import MetadataEnumDetailContent from './metadata-enum-detail-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  if (!id || id.trim() === '' || isNaN(Number(id))) {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Metadata Enum ID</h3>
          <p className="text-muted-foreground mb-4">
            The metadata enum ID is invalid.
          </p>
        </div>
      </div>
    );
  }

  const enumId = Number(id);
  
  // Prefetch with error handling - if it fails, client will handle it
  let queryClient;
  try {
    queryClient = await prefetchMetadataEnum(enumId);
  } catch (error) {
    // Prefetch failed (e.g., no auth token), create empty query client
    // Client will fetch on mount
    const { makeQueryClient } = await import('@kit/lib/queryClient.server');
    queryClient = makeQueryClient();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MetadataEnumDetailContent enumId={enumId} />
    </HydrationBoundary>
  );
}
