import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchExpenses } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import ExpensesContent from './expenses-content';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = await prefetchExpenses();

  return (
    <AppLayout>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ExpensesContent />
      </HydrationBoundary>
    </AppLayout>
  );
}

