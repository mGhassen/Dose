import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchExpenses } from '@kit/hooks';
import AppLayout from '@/components/app-layout';
import ExpensesContent from './expenses-content';

export default async function Page() {
  const year = new Date().getFullYear().toString();
  const queryClient = await prefetchExpenses(undefined, { page: 1, limit: 20, year });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AppLayout>
        <ExpensesContent />
      </AppLayout>
    </HydrationBoundary>
  );
}

