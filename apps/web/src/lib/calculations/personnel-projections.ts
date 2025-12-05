// Personnel Salary Projection Calculation Service
// Projects all personnel salaries for timeline and budgeting
// Calculates brute/net salary, social taxes, and employer taxes

import type { 
  Personnel, 
  PersonnelSalaryProjection
} from '@kit/types';

// Default employee social tax rate (20% - typical in Tunisia)
// Should be overridden with value from variables
const DEFAULT_EMPLOYEE_SOCIAL_TAX_RATE = 0.20;

/**
 * Project a single personnel's salary across a date range
 * Calculates monthly projections with brute, net, social taxes, and employer taxes
 * @param employeeSocialTaxRate - Employee social tax rate as decimal (e.g., 0.20 for 20%). Defaults to 20% if not provided.
 * @param socialSecurityRate - Social security rate (employer charges) as decimal (e.g., 0.1875 for 18.75%). Defaults to 18.75% if not provided.
 */
export function projectPersonnelSalary(
  personnel: Personnel,
  startMonth: string, // YYYY-MM
  endMonth: string, // YYYY-MM
  employeeSocialTaxRate: number = DEFAULT_EMPLOYEE_SOCIAL_TAX_RATE,
  socialSecurityRate?: number // Optional, will use personnel.employerCharges if not provided
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

  // Calculate salary breakdown
  const bruteSalary = personnel.baseSalary;
  
  // Social taxes = difference between brute and net (deducted from brute)
  // Use Social Security Rate for social taxes (what gets deducted from brute)
  const socialTaxes = socialSecurityRate !== undefined 
    ? bruteSalary * socialSecurityRate 
    : bruteSalary * 0.1875; // Default 18.75%
  const netSalary = bruteSalary - socialTaxes;
  
  // Employer taxes = total charge added to brut
  // Use Employee Social Tax Rate for employer taxes (what gets added on top)
  const employerTaxes = bruteSalary * employeeSocialTaxRate;
  
  // Debug: Log calculation to verify
  if (process.env.NODE_ENV === 'development') {
    console.log('Personnel salary calculation:', {
      personnelId: personnel.id,
      bruteSalary,
      employeeSocialTaxRate,
      socialTaxes,
      netSalary,
      socialSecurityRate,
      employerTaxes,
    });
  }

  // Generate projections for each month
  let currentDate = new Date(Math.max(start.getTime(), personnelStart.getTime()));
  const finalDate = personnelEnd 
    ? new Date(Math.min(end.getTime(), personnelEnd.getTime())) 
    : end;

  while (currentDate <= finalDate) {
    const month = currentDate.toISOString().slice(0, 7); // YYYY-MM
    const isFuture = currentDate > new Date();

    // Payment dates: net on 5th, taxes on 15th
    const netPaymentDate = `${month}-05`;
    const taxesPaymentDate = `${month}-15`;

    projections.push({
      personnelId: personnel.id,
      month,
      bruteSalary,
      netSalary,
      socialTaxes,
      employerTaxes,
      netPaymentDate,
      taxesPaymentDate,
      isProjected: isFuture,
    });

    // Move to next month
    currentDate = new Date(currentDate);
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return projections;
}

/**
 * Project all personnel salaries for a given date range
 * @param employeeSocialTaxRate - Employee social tax rate as decimal (e.g., 0.20 for 20%). Defaults to 20% if not provided.
 * @param socialSecurityRate - Social security rate (employer charges) as decimal (e.g., 0.1875 for 18.75%). Optional.
 */
export function projectPersonnelSalariesForRange(
  personnelList: Personnel[],
  startMonth: string, // YYYY-MM
  endMonth: string, // YYYY-MM
  employeeSocialTaxRate: number = DEFAULT_EMPLOYEE_SOCIAL_TAX_RATE,
  socialSecurityRate?: number
): PersonnelSalaryProjection[] {
  const allProjections: PersonnelSalaryProjection[] = [];

  for (const personnel of personnelList) {
    const projections = projectPersonnelSalary(personnel, startMonth, endMonth, employeeSocialTaxRate, socialSecurityRate);
    allProjections.push(...projections);
  }

  return allProjections.sort((a, b) => {
    // Sort by month, then by personnel ID
    if (a.month !== b.month) {
      return a.month.localeCompare(b.month);
    }
    return a.personnelId - b.personnelId;
  });
}

/**
 * Project all personnel salaries for a given year
 * @param employeeSocialTaxRate - Employee social tax rate as decimal (e.g., 0.20 for 20%). Defaults to 20% if not provided.
 * @param socialSecurityRate - Social security rate (employer charges) as decimal (e.g., 0.1875 for 18.75%). Optional.
 */
export function projectPersonnelSalariesForYear(
  personnelList: Personnel[],
  year: string, // YYYY
  employeeSocialTaxRate: number = DEFAULT_EMPLOYEE_SOCIAL_TAX_RATE,
  socialSecurityRate?: number
): PersonnelSalaryProjection[] {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;
  return projectPersonnelSalariesForRange(personnelList, startMonth, endMonth, employeeSocialTaxRate, socialSecurityRate);
}

