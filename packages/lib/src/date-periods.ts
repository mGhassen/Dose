export type DatePeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year';

import { dateToYYYYMMDD } from './date-utils';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  label?: string;
}

function toISODate(d: Date): string {
  return dateToYYYYMMDD(d);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1); // Monday = start
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(d: Date): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfMonth(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfQuarter(d: Date): Date {
  const copy = new Date(d);
  copy.setMonth(Math.floor(copy.getMonth() / 3) * 3, 1);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfQuarter(d: Date): Date {
  const start = startOfQuarter(d);
  const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getDateRangeForPreset(preset: DatePeriodPreset, refDate = new Date()): DateRange {
  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today': {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { startDate: toISODate(today), endDate: toISODate(end), label: 'Today' };
    }
    case 'yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      return { startDate: toISODate(d), endDate: toISODate(end), label: 'Yesterday' };
    }
    case 'this_week': {
      const start = startOfWeek(today);
      const end = endOfWeek(today);
      return { startDate: toISODate(start), endDate: toISODate(end), label: 'This week' };
    }
    case 'last_week': {
      const thisWeekStart = startOfWeek(today);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59, 999);
      return {
        startDate: toISODate(lastWeekStart),
        endDate: toISODate(lastWeekEnd),
        label: 'Last week',
      };
    }
    case 'this_month': {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return { startDate: toISODate(start), endDate: toISODate(end), label: 'This month' };
    }
    case 'last_month': {
      const firstOfThisMonth = startOfMonth(today);
      const lastMonthEnd = new Date(firstOfThisMonth);
      lastMonthEnd.setDate(0);
      const lastMonthStart = startOfMonth(lastMonthEnd);
      lastMonthEnd.setHours(23, 59, 59, 999);
      return {
        startDate: toISODate(lastMonthStart),
        endDate: toISODate(lastMonthEnd),
        label: 'Last month',
      };
    }
    case 'this_quarter': {
      const start = startOfQuarter(today);
      const end = endOfQuarter(today);
      return { startDate: toISODate(start), endDate: toISODate(end), label: 'This quarter' };
    }
    case 'last_quarter': {
      const thisQStart = startOfQuarter(today);
      const lastQEnd = new Date(thisQStart);
      lastQEnd.setDate(0);
      const lastQStart = startOfQuarter(lastQEnd);
      lastQEnd.setHours(23, 59, 59, 999);
      return {
        startDate: toISODate(lastQStart),
        endDate: toISODate(lastQEnd),
        label: 'Last quarter',
      };
    }
    case 'this_year': {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      end.setHours(23, 59, 59, 999);
      return { startDate: toISODate(start), endDate: toISODate(end), label: 'This year' };
    }
    case 'last_year': {
      const y = today.getFullYear() - 1;
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      end.setHours(23, 59, 59, 999);
      return { startDate: toISODate(start), endDate: toISODate(end), label: 'Last year' };
    }
  }
}

export const DATE_PERIOD_PRESETS: { value: DatePeriodPreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'last_quarter', label: 'Last quarter' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
];

export function getMonthsInRange(startDate: string, endDate: string): string[] {
  const months: string[] = [];
  const startMonth = startDate.slice(0, 7); // YYYY-MM
  const endMonth = endDate.slice(0, 7);
  const [sy, sm] = startMonth.split('-').map(Number);
  const [ey, em] = endMonth.split('-').map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}
