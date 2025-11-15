import { apiRequest } from './api';
import type { Loan, LoanScheduleEntry, CreateLoanData, UpdateLoanData } from '@kit/types';

export interface UpdateLoanScheduleEntryData {
  paymentDate?: string;
  principalPayment?: number;
  interestPayment?: number;
  totalPayment?: number;
  remainingBalance?: number;
  isPaid?: boolean;
  paidDate?: string | null;
}

export const loansApi = {
  getAll: () => apiRequest<Loan[]>('GET', '/api/loans'),
  getById: (id: string) => apiRequest<Loan>('GET', `/api/loans/${id}`),
  create: (data: CreateLoanData) => apiRequest<Loan>('POST', '/api/loans', data),
  update: (id: string, data: UpdateLoanData) => apiRequest<Loan>('PUT', `/api/loans/${id}`, data),
  delete: (id: string) => apiRequest<void>('DELETE', `/api/loans/${id}`),
  getSchedule: (loanId: string) => apiRequest<LoanScheduleEntry[]>('GET', `/api/loans/${loanId}/schedule`),
  generateSchedule: (loanId: string) => apiRequest<LoanScheduleEntry[]>('POST', `/api/loans/${loanId}/generate-schedule`),
  updateScheduleEntry: (loanId: string, scheduleId: string, data: UpdateLoanScheduleEntryData) => 
    apiRequest<LoanScheduleEntry>('PUT', `/api/loans/${loanId}/schedule/${scheduleId}`, data),
};

