// React Query hook for Loans Analytics

import { useQuery } from '@tanstack/react-query';

export interface LoansAnalytics {
  statusBreakdown: Array<{ status: string; count: number; totalPrincipal: number; percentage: number }>;
  monthlyPayments: Array<{ month: string; principal: number; interest: number; total: number; count: number }>;
  upcomingPayments: Array<{ month: string; total: number }>;
  summary: {
    totalLoans: number;
    activeLoans: number;
    totalPrincipal: number;
    totalInterest: number;
    totalPaid: number;
    totalRemaining: number;
    avgInterestRate: number;
  };
}

export function useLoansAnalytics() {
  return useQuery<LoansAnalytics>({
    queryKey: ['loans-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/loans/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch loans analytics');
      }
      return response.json();
    },
  });
}

