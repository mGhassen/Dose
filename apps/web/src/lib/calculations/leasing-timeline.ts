// Leasing Payment Timeline Calculation Service
// Projects leasing payments over time based on frequency

import type { LeasingPayment, ExpenseRecurrence } from '@kit/types';

export interface LeasingTimelineEntry {
  month: string; // YYYY-MM
  leasingId: number;
  leasingName: string;
  amount: number;
  isProjected: boolean;
  paymentDate: string; // ISO date
}

/**
 * Project a single leasing payment across a date range based on its frequency
 */
export function projectLeasingPayment(
  leasing: LeasingPayment,
  startMonth: string, // YYYY-MM
  endMonth: string // YYYY-MM
): LeasingTimelineEntry[] {
  const entries: LeasingTimelineEntry[] = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  
  const leasingStart = new Date(leasing.startDate);
  const leasingEnd = leasing.endDate ? new Date(leasing.endDate) : null;

  // Only project active leasing
  if (!leasing.isActive) {
    return entries;
  }

  // Handle one-time payments
  if (leasing.frequency === ExpenseRecurrence.ONE_TIME) {
    const paymentMonth = leasingStart.toISOString().slice(0, 7);
    if (paymentMonth >= startMonth && paymentMonth <= endMonth) {
      if (leasingStart >= start && leasingStart <= end) {
        if (!leasingEnd || leasingStart <= leasingEnd) {
          entries.push({
            month: paymentMonth,
            leasingId: leasing.id,
            leasingName: leasing.name,
            amount: leasing.amount,
            isProjected: leasingStart > new Date(),
            paymentDate: leasingStart.toISOString(),
          });
        }
      }
    }
    return entries;
  }

  // Handle recurring payments
  let currentDate = new Date(Math.max(start.getTime(), leasingStart.getTime()));
  const finalDate = leasingEnd 
    ? new Date(Math.min(end.getTime(), leasingEnd.getTime())) 
    : end;

  while (currentDate <= finalDate) {
    const month = currentDate.toISOString().slice(0, 7);

    let shouldInclude = false;

    switch (leasing.frequency) {
      case ExpenseRecurrence.MONTHLY:
        shouldInclude = true;
        break;

      case ExpenseRecurrence.QUARTERLY:
        const monthNum = currentDate.getMonth();
        const startMonthNum = leasingStart.getMonth();
        shouldInclude = (monthNum - startMonthNum) % 3 === 0 && 
                       monthNum >= startMonthNum;
        break;

      case ExpenseRecurrence.YEARLY:
        shouldInclude = currentDate.getMonth() === leasingStart.getMonth();
        break;

      case ExpenseRecurrence.CUSTOM:
        shouldInclude = true;
        break;
    }

    if (shouldInclude) {
      entries.push({
        month,
        leasingId: leasing.id,
        leasingName: leasing.name,
        amount: leasing.amount,
        isProjected: currentDate > new Date(),
        paymentDate: currentDate.toISOString(),
      });
    }

    // Move to next month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return entries;
}

/**
 * Project all leasing payments for a given date range
 */
export function projectLeasingPaymentsForRange(
  leasingPayments: LeasingPayment[],
  startMonth: string,
  endMonth: string
): LeasingTimelineEntry[] {
  const allEntries: LeasingTimelineEntry[] = [];

  for (const leasing of leasingPayments) {
    const entries = projectLeasingPayment(leasing, startMonth, endMonth);
    allEntries.push(...entries);
  }

  return allEntries.sort((a, b) => a.month.localeCompare(b.month));
}

