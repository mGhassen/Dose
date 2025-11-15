// React Query hooks for Loans

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { loansApi, type UpdateLoanScheduleEntryData } from '@kit/lib';
import type { Loan, LoanScheduleEntry, CreateLoanData, UpdateLoanData } from '@kit/types';

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: loansApi.getAll,
  });
}

export function useLoanById(id: string) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: () => loansApi.getById(id),
    enabled: !!id,
  });
}

export function useLoanSchedule(loanId: string) {
  return useQuery({
    queryKey: ['loans', loanId, 'schedule'],
    queryFn: () => loansApi.getSchedule(loanId),
    enabled: !!loanId,
  });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: loansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLoanData }) => 
      loansApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.id, 'schedule'] });
    },
  });
}

export function useDeleteLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: loansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useGenerateLoanSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: loansApi.generateSchedule,
    onSuccess: (_, loanId) => {
      queryClient.invalidateQueries({ queryKey: ['loans', loanId, 'schedule'] });
    },
  });
}

export function useUpdateLoanScheduleEntry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ loanId, scheduleId, data }: { loanId: string; scheduleId: string; data: UpdateLoanScheduleEntryData }) => 
      loansApi.updateScheduleEntry(loanId, scheduleId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId, 'schedule'] });
      queryClient.invalidateQueries({ queryKey: ['loans', variables.loanId] });
    },
  });
}

