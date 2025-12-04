// Personnel Salary Projection Calculation Service
// Projects all personnel salaries for timeline and budgeting

import type { 
  Personnel, 
  PersonnelSalaryProjection
} from '@kit/types';

/**
 * Calculate salary breakdown from base salary and employer charges
 * This is a simplified calculation - in reality, tax calculations are complex
 * and vary by country/region. This provides a basic structure that can be customized.
 */
function calculateSalaryBreakdown(
  baseSalary: number,
  employerCharges: number,
  employerChargesType: 'percentage' | 'fixed'
): {
  bruteSalary: number;
  netSalary: number;
  socialTaxes: number;
  employerTaxes: number;
} {
  // Calculate employer taxes
  const employerTaxes = employerChargesType === 'percentage' 
    ? (baseSalary * employerCharges / 100)
    : employerCharges;
  
  // Brute salary = base salary (gross)
  const bruteSalary = baseSalary;
  
  // Simplified: Assume ~20% for employee social taxes (this should be configurable)
  // In reality, this varies by country and employee situation
  const employeeSocialTaxRate = 0.20; // 20% - should be configurable per personnel or globally
  const socialTaxes = bruteSalary * employeeSocialTaxRate;
  
  // Net salary = brute - employee social taxes
  const netSalary = bruteSalary - socialTaxes;
  
  return {
    bruteSalary,
    netSalary,
    socialTaxes,
    employerTaxes
  };
}

/**
 * Project a single personnel's salary across a date range
 */
export function projectPersonnelSalary(
  personnel: Personnel,
  startMonth: string, // YYYY-MM
  endMonth: string, // YYYY-MM
  customAmounts?: Record<string, {
    bruteSalary?: number;
    netSalary?: number;
    socialTaxes?: number;
    employerTaxes?: number;
  }> // Optional: custom amounts per month for variations
): PersonnelSalaryProjection[] {
  const projections: PersonnelSalaryProjection[] = [];
  const start = new Date(startMonth + '-01');
  const end = new Date(endMonth + '-01');
  end.setMonth(end.getMonth() + 1); // Set to first day of next month for comparison
  end.setDate(0); // Then go back to last day of target month
  
  const personnelStart = new Date(personnel.startDate);
  const personnelEnd = personnel.endDate ? new Date(personnel.endDate) : null;

  // Only project active personnel
  if (!personnel.isActive) {
    return projections;
  }

  // Start from the later of: requested start or personnel start date
  let currentDate = new Date(Math.max(start.getTime(), personnelStart.getTime()));
  const finalDate = personnelEnd 
    ? new Date(Math.min(end.getTime(), personnelEnd.getTime())) 
    : end;

  while (currentDate <= finalDate) {
    const month = currentDate.toISOString().slice(0, 7);
    
    // Check if there are custom amounts for this month
    const customAmountsForMonth = customAmounts?.[month];
    
    // Calculate salary breakdown (use custom if provided, otherwise calculate from base)
    const breakdown = customAmountsForMonth 
      ? {
          bruteSalary: customAmountsForMonth.bruteSalary ?? personnel.baseSalary,
          netSalary: customAmountsForMonth.netSalary ?? 0,
          socialTaxes: customAmountsForMonth.socialTaxes ?? 0,
          employerTaxes: customAmountsForMonth.employerTaxes ?? 0,
        }
      : calculateSalaryBreakdown(
          personnel.baseSalary,
          personnel.employerCharges,
          personnel.employerChargesType
        );

    projections.push({
      personnelId: personnel.id,
      month,
      bruteSalary: breakdown.bruteSalary,
      netSalary: breakdown.netSalary,
      socialTaxes: breakdown.socialTaxes,
      employerTaxes: breakdown.employerTaxes,
      isProjected: currentDate > new Date(), // Projected if in the future
      isNetPaid: false,
      isTaxesPaid: false,
    });

    // Move to next month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return projections;
}

/**
 * Project all personnel salaries for a given year
 */
export function projectPersonnelSalariesForYear(
  personnel: Personnel[],
  year: string // YYYY
): PersonnelSalaryProjection[] {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  
  const allProjections: PersonnelSalaryProjection[] = [];
  
  personnel.forEach(person => {
    const projections = projectPersonnelSalary(person, startMonth, endMonth);
    allProjections.push(...projections);
  });
  
  return allProjections;
}

/**
 * Project all personnel salaries for a date range
 */
export function projectPersonnelSalariesForRange(
  personnel: Personnel[],
  startMonth: string, // YYYY-MM
  endMonth: string // YYYY-MM
): PersonnelSalaryProjection[] {
  const allProjections: PersonnelSalaryProjection[] = [];
  
  personnel.forEach(person => {
    const projections = projectPersonnelSalary(person, startMonth, endMonth);
    allProjections.push(...projections);
  });
  
  return allProjections;
}

