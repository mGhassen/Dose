// Depreciation Calculation Service
// Calculates depreciation schedules for investments

import type { Investment, DepreciationEntry, DepreciationMethod } from '@kit/types';

/**
 * Calculate depreciation schedule for an investment
 */
export function calculateDepreciation(
  investment: Investment,
  startMonth: string // YYYY-MM
): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];
  const depreciableAmount = investment.amount - investment.residualValue;
  let accumulatedDepreciation = 0;

  if (investment.depreciationMethod === DepreciationMethod.STRAIGHT_LINE) {
    const monthlyDepreciation = depreciableAmount / investment.usefulLifeMonths;
    
    for (let i = 0; i < investment.usefulLifeMonths; i++) {
      const monthDate = new Date(startMonth + '-01');
      monthDate.setMonth(monthDate.getMonth() + i);
      const month = monthDate.toISOString().slice(0, 7); // YYYY-MM

      accumulatedDepreciation += monthlyDepreciation;
      const bookValue = investment.amount - accumulatedDepreciation;

      entries.push({
        id: 0,
        investmentId: investment.id,
        month,
        depreciationAmount: Math.round(monthlyDepreciation * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
        bookValue: Math.max(investment.residualValue, Math.round(bookValue * 100) / 100),
      });
    }
  } else if (investment.depreciationMethod === DepreciationMethod.DECLINING_BALANCE) {
    // Double declining balance method
    const annualRate = 2 / (investment.usefulLifeMonths / 12); // 2x straight-line rate
    const monthlyRate = annualRate / 12;
    let bookValue = investment.amount;

    for (let i = 0; i < investment.usefulLifeMonths; i++) {
      const monthDate = new Date(startMonth + '-01');
      monthDate.setMonth(monthDate.getMonth() + i);
      const month = monthDate.toISOString().slice(0, 7); // YYYY-MM

      const depreciationAmount = Math.min(
        bookValue * monthlyRate,
        bookValue - investment.residualValue
      );
      accumulatedDepreciation += depreciationAmount;
      bookValue = investment.amount - accumulatedDepreciation;

      entries.push({
        id: 0,
        investmentId: investment.id,
        month,
        depreciationAmount: Math.round(depreciationAmount * 100) / 100,
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
        bookValue: Math.max(investment.residualValue, Math.round(bookValue * 100) / 100),
      });
    }
  }
  // TODO: Add units of production method if needed

  return entries;
}

/**
 * Get total depreciation for a specific month
 */
export function getDepreciationForMonth(
  investments: Investment[],
  depreciationEntries: DepreciationEntry[],
  month: string // YYYY-MM
): number {
  return depreciationEntries
    .filter(entry => entry.month === month)
    .reduce((sum, entry) => sum + entry.depreciationAmount, 0);
}

