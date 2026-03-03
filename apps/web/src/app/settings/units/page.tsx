import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchUnits } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import UnitsSettingsContent from './units-content';

export default async function UnitsSettingsPage() {
  const queryClient = await prefetchUnits();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UnitsSettingsContent />
    </HydrationBoundary>
  );
}
