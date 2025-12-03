// Loan Calculation Service
// Calculates loan amortization schedules

import type { Loan, LoanScheduleEntry } from '@kit/types';

/**
 * Calculate loan amortization schedule
 * Handles off-payment months where only interest is paid (no principal)
 * Off-payment months extend the loan duration (e.g., 60 months base + 6 off-payment = 66 total months)
 * The off-payment months occur during the base period, and extra months are added at the end
 */
export function calculateLoanSchedule(loan: Loan): LoanScheduleEntry[] {
  const monthlyRate = loan.interestRate / 12 / 100;
  const offPaymentMonths = new Set(loan.offPaymentMonths || []);
  const numOffPaymentMonths = offPaymentMonths.size;
  
  // Total duration = base duration + number of off-payment months
  // Off-payment months extend the loan because no principal is paid during those months
  const totalDurationMonths = loan.durationMonths + numOffPaymentMonths;
  
  // Calculate standard monthly payment based on the BASE duration
  // This payment amount will be used for all non-off-payment months
  const monthlyPayment = loan.principalAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, loan.durationMonths)) / 
    (Math.pow(1 + monthlyRate, loan.durationMonths) - 1);

  const schedule: LoanScheduleEntry[] = [];
  let remainingBalance = loan.principalAmount;
  const startDate = new Date(loan.startDate);
  let monthNumber = 1; // Track the month number in the schedule

  // Generate schedule for total duration (base + extension months)
  for (let month = 1; month <= totalDurationMonths; month++) {
    const interestPayment = remainingBalance * monthlyRate;
    
    // Check if this is an off-payment month (only within the base duration)
    const isOffPaymentMonth = month <= loan.durationMonths && offPaymentMonths.has(month);
    
    // In off-payment months, only pay interest (no principal)
    // In all other months, pay normal principal + interest
    let principalPayment: number;
    let totalPayment: number;
    
    if (isOffPaymentMonth) {
      // Off-payment month: only interest, no principal
      principalPayment = 0;
      totalPayment = interestPayment;
    } else {
      // Normal payment month: principal + interest
      principalPayment = monthlyPayment - interestPayment;
      totalPayment = monthlyPayment;
    }
    
    remainingBalance -= principalPayment;

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + month - 1);

    schedule.push({
      id: 0, // Will be set by database
      loanId: loan.id,
      month: monthNumber,
      paymentDate: paymentDate.toISOString().split('T')[0],
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
      remainingBalance: Math.max(0, Math.round(remainingBalance * 100) / 100), // Ensure non-negative
      isPaid: false,
    });
    
    monthNumber++;
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

