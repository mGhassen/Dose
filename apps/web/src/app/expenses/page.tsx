import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchExpenses } from '@kit/hooks';
import ExpensesContent from './expenses-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchExpenses();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExpensesContent />
    </HydrationBoundary>
  );
}

