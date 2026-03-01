import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchMetadataEnums } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import MetadataEnumsContent from './metadata-enums-content';

export default async function Page() {
  const queryClient = await prefetchMetadataEnums();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <MetadataEnumsContent />
      </AppLayout>
    </HydrationBoundary>
  );
}




