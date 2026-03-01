import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchBalanceSheet } from '@kit/hooks';
import BalanceSheetContent from './balance-sheet-content';

export default async function Page() {
  const queryClient = await prefetchBalanceSheet();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <BalanceSheetContent />
    </HydrationBoundary>
  );
}
