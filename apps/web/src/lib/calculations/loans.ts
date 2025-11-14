// Loan Calculation Service
// Calculates loan amortization schedules

import type { Loan, LoanScheduleEntry } from '@kit/types';

/**
 * Calculate loan amortization schedule
 */
export function calculateLoanSchedule(loan: Loan): LoanScheduleEntry[] {
  const monthlyRate = loan.interestRate / 12 / 100;
  const monthlyPayment = loan.principalAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, loan.durationMonths)) / 
    (Math.pow(1 + monthlyRate, loan.durationMonths) - 1);

  const schedule: LoanScheduleEntry[] = [];
  let remainingBalance = loan.principalAmount;
  const startDate = new Date(loan.startDate);

  for (let month = 1; month <= loan.durationMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingBalance -= principalPayment;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + month - 1);

    schedule.push({
      id: 0, // Will be set by database
      loanId: loan.id,
      month,
      paymentDate: paymentDate.toISOString().split('T')[0],
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      totalPayment: Math.round(monthlyPayment * 100) / 100,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100), // Ensure non-negative
      isPaid: false,
    });
  }

  return schedule;
}

/**
 * Get total interest paid over loan lifetime
 */
export function getTotalInterest(loan: Loan): number {
  const schedule = calculateLoanSchedule(loan);
  return schedule.reduce((sum, entry) => sum + entry.interestPayment, 0);
}

/**
 * Get remaining balance at a specific month
 */
export function getRemainingBalanceAtMonth(loan: Loan, month: number): number {
  const schedule = calculateLoanSchedule(loan);
  const entry = schedule.find(e => e.month === month);
  return entry ? entry.remainingBalance : 0;
}

