export type DatePeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'this_year'
  | 'last_year';

import { dateToYYYYMMDD, formatYYYYMMDDParts, resolveUserTimeZoneForSession } from './date-utils';
import { getDatePartsInTimeZone } from './date-format';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  label?: string;
}

function addCalendarDays(y: number, m: number, d: number, delta: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function daysInGregorianMonth(y: number, month: number): number {
  return new Date(Date.UTC(y, month, 0)).getUTCDate();
}

/** Monday (Gregorian) of the week containing (y,m,d); week starts Monday (EU). */
function startOfWeekMonday(y: number, m: number, d: number): { y: number; m: number; d: number } {
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const toMon = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(y, m, d, toMon);
}

function startOfQuarterYMD(y: number, m: number): { y: number; m: number; d: number } {
  const qStartMonth = Math.floor((m - 1) / 3) * 3 + 1;
  return { y, m: qStartMonth, d: 1 };
}

function endOfQuarterYMD(y: number, m: number): { y: number; m: number; d: number } {
  const start = startOfQuarterYMD(y, m);
  const endMonth = start.m + 2;
  const lastDay = daysInGregorianMonth(start.y, endMonth);
  return { y: start.y, m: endMonth, d: lastDay };
}

function addCalendarMonths(y: number, m: number, d: number, addM: number): { y: number; m: number; d: number } {
  let nm = m + addM;
  let ny = y;
  while (nm > 12) {
    nm -= 12;
    ny += 1;
  }
  while (nm < 1) {
    nm += 12;
    ny -= 1;
  }
  const dim = daysInGregorianMonth(ny, nm);
  const dd = Math.min(d, dim);
  return { y: ny, m: nm, d: dd };
}

/**
 * Preset ranges use the **calendar date in the user’s timezone** (from settings), not `Date` local midnight
 * in the browser — that mismatch caused “today / yesterday” and custom ranges to shift by one day.
 */
export function getDateRangeForPreset(preset: DatePeriodPreset, refDate = new Date()): DateRange {
  const tz = resolveUserTimeZoneForSession();
  const { y: cy, m: cm, d: cd } = getDatePartsInTimeZone(refDate, tz);
  const todayStr = formatYYYYMMDDParts(cy, cm, cd);

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr, label: 'Today' };
    case 'yesterday': {
      const p = addCalendarDays(cy, cm, cd, -1);
      const s = formatYYYYMMDDParts(p.y, p.m, p.d);
      return { startDate: s, endDate: s, label: 'Yesterday' };
    }
    case 'this_week': {
      const mon = startOfWeekMonday(cy, cm, cd);
      const sun = addCalendarDays(mon.y, mon.m, mon.d, 6);
      return {
        startDate: formatYYYYMMDDParts(mon.y, mon.m, mon.d),
        endDate: formatYYYYMMDDParts(sun.y, sun.m, sun.d),
        label: 'This week',
      };
    }
    case 'last_week': {
      const thisMon = startOfWeekMonday(cy, cm, cd);
      const lastMon = addCalendarDays(thisMon.y, thisMon.m, thisMon.d, -7);
      const lastSun = addCalendarDays(lastMon.y, lastMon.m, lastMon.d, 6);
      return {
        startDate: formatYYYYMMDDParts(lastMon.y, lastMon.m, lastMon.d),
        endDate: formatYYYYMMDDParts(lastSun.y, lastSun.m, lastSun.d),
        label: 'Last week',
      };
    }
    case 'this_month': {
      const lastD = daysInGregorianMonth(cy, cm);
      return {
        startDate: formatYYYYMMDDParts(cy, cm, 1),
        endDate: formatYYYYMMDDParts(cy, cm, lastD),
        label: 'This month',
      };
    }
    case 'last_month': {
      const firstThis = { y: cy, m: cm, d: 1 };
      const lastPrev = addCalendarDays(firstThis.y, firstThis.m, firstThis.d, -1);
      const firstPrev = { y: lastPrev.y, m: lastPrev.m, d: 1 };
      return {
        startDate: formatYYYYMMDDParts(firstPrev.y, firstPrev.m, firstPrev.d),
        endDate: formatYYYYMMDDParts(lastPrev.y, lastPrev.m, lastPrev.d),
        label: 'Last month',
      };
    }
    case 'this_quarter': {
      const start = startOfQuarterYMD(cy, cm);
      const end = endOfQuarterYMD(cy, cm);
      return {
        startDate: formatYYYYMMDDParts(start.y, start.m, start.d),
        endDate: formatYYYYMMDDParts(end.y, end.m, end.d),
        label: 'This quarter',
      };
    }
    case 'last_quarter': {
      const thisQ = startOfQuarterYMD(cy, cm);
      const dayBefore = addCalendarDays(thisQ.y, thisQ.m, thisQ.d, -1);
      const lastQStart = startOfQuarterYMD(dayBefore.y, dayBefore.m);
      const lastQEnd = endOfQuarterYMD(dayBefore.y, dayBefore.m);
      return {
        startDate: formatYYYYMMDDParts(lastQStart.y, lastQStart.m, lastQStart.d),
        endDate: formatYYYYMMDDParts(lastQEnd.y, lastQEnd.m, lastQEnd.d),
        label: 'Last quarter',
      };
    }
    case 'last_3_months': {
      const start = addCalendarMonths(cy, cm, cd, -3);
      return {
        startDate: formatYYYYMMDDParts(start.y, start.m, start.d),
        endDate: todayStr,
        label: 'Last 3 months',
      };
    }
    case 'last_6_months': {
      const start = addCalendarMonths(cy, cm, cd, -6);
      return {
        startDate: formatYYYYMMDDParts(start.y, start.m, start.d),
        endDate: todayStr,
        label: 'Last 6 months',
      };
    }
    case 'last_12_months': {
      const start = addCalendarMonths(cy, cm, cd, -12);
      return {
        startDate: formatYYYYMMDDParts(start.y, start.m, start.d),
        endDate: todayStr,
        label: 'Last 12 months',
      };
    }
    case 'this_year':
      return {
        startDate: formatYYYYMMDDParts(cy, 1, 1),
        endDate: formatYYYYMMDDParts(cy, 12, 31),
        label: 'This year',
      };
    case 'last_year': {
      const ly = cy - 1;
      return {
        startDate: formatYYYYMMDDParts(ly, 1, 1),
        endDate: formatYYYYMMDDParts(ly, 12, 31),
        label: 'Last year',
      };
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
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
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
