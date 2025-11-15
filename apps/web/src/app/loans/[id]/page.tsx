import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { prefetchLoan, prefetchLoanSchedule } from '@kit/hooks/server/prefetchLoans';
import LoanDetailsContent from './loan-details-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  // Validate ID
  if (!id || id.trim() === '') {
    return (
      <div className="container py-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium mb-2">Invalid Loan ID</h3>
          <p className="text-muted-foreground mb-4">
            The loan ID is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Prefetch data on server
  const queryClient = await prefetchLoan(id);
  await prefetchLoanSchedule(id, queryClient);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <LoanDetailsContent loanId={id} />
    </HydrationBoundary>
  );
}

