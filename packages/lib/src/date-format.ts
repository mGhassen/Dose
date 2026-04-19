/**
 * Dynamic date formatting utilities that respect user preferences
 * All date formatting should use these functions for consistency
 * 
 * NOTE: For reactive date formatting that updates when user settings change,
 * use the useDateFormat hook instead of these direct functions.
 */

import { getUserSettings } from './user-settings';

/**
 * Clean timezone value by removing any potential prefixes
 */
export function cleanTimezone(timezone: string | undefined): string {
  if (!timezone) return 'Europe/Paris';
  
  // Remove common prefixes that might be added incorrectly
  const cleaned = timezone.replace(/^(for|to|in)/, '').trim();
  
  // Log warning if we detected a corrupted timezone
  if (cleaned !== timezone) {
    console.warn(`Detected corrupted timezone value: "${timezone}" -> cleaned to: "${cleaned}"`);
  }
  
  // Validate that it's a proper timezone format
  if (cleaned && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(cleaned)) {
    return cleaned;
  }
  
  // Fallback to default if invalid
  console.warn(`Invalid timezone format: "${timezone}", falling back to Europe/Paris`);
  return 'Europe/Paris';
}

/**
 * Convert date format string to Intl.DateTimeFormat options
 */
function getDateFormatOptions(format: string, includeTime = false) {
  const settings = getUserSettings();
  const locale = settings.formattingLocale ?? 'fr-FR';

  const cleanedTimezone = cleanTimezone(settings.timezone);
  
  const baseOptions = {
    locale,
    timeZone: cleanedTimezone,
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const,
    ...(includeTime && {
      hour: '2-digit' as const,
      minute: '2-digit' as const,
      hour12: settings.timeFormat === '12h'
    })
  };

  // Handle different date formats
  switch (format) {
    case 'MM/DD/YYYY':
      return { ...baseOptions };
    case 'DD/MM/YYYY':
      return { ...baseOptions };
    case 'YYYY-MM-DD':
      return { ...baseOptions };
    case 'DD-MM-YYYY':
      return { ...baseOptions };
    case 'MM-DD-YYYY':
      return { ...baseOptions };
    case 'DD.MM.YYYY':
      return { ...baseOptions };
    case 'MM.DD.YYYY':
      return { ...baseOptions };
    case 'DD MMM YYYY':
      return {
        ...baseOptions,
        month: 'short' as const
      };
    case 'MMM DD, YYYY':
      return {
        ...baseOptions,
        month: 'short' as const
      };
    case 'DD MMMM YYYY':
      return {
        ...baseOptions,
        month: 'long' as const
      };
    case 'MMMM DD, YYYY':
      return {
        ...baseOptions,
        month: 'long' as const
      };
    default:
      return baseOptions;
  }
}

/**
 * Format date according to user preferences
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
  
  try {
    const settings = getUserSettings();
    const options = getDateFormatOptions(settings.dateFormat);
    
    return dateObj.toLocaleDateString(options.locale, {
      timeZone: options.timeZone,
      year: options.year,
      month: options.month,
      day: options.day
    });
  } catch (error) {
    // Fallback to consistent format if settings can't be loaded
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

/**
 * Format date and time according to user preferences
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  try {
    const settings = getUserSettings();
    const options = getDateFormatOptions(settings.dateFormat, true);
    
    return dateObj.toLocaleDateString(options.locale, {
      timeZone: options.timeZone,
      year: options.year,
      month: options.month,
      day: options.day,
      hour: options.hour,
      minute: options.minute,
      hour12: options.hour12
    });
  } catch (error) {
    // Fallback to consistent format if settings can't be loaded
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Format time according to user preferences
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleTimeString(locale, {
      timeZone: cleanedTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: settings.timeFormat === '12h'
    });
  } catch (error) {
    // Fallback to consistent format if settings can't be loaded
    return dateObj.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Format date in short format (e.g., "16 juil. 2025")
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Format date in long format (e.g., "mercredi 16 juillet 2025")
 */
export function formatLongDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    // Fallback to consistent format if settings can't be loaded
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/**
 * Format date for display in calendar (e.g., "16 juil.")
 */
export function formatCalendarDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      day: '2-digit',
      month: 'short'
    });
  } catch (error) {
    return dateObj.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short'
    });
  }
}

/**
 * Format date range (e.g., "16 juil. - 23 juil.")
 */
export function formatDateRange(startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string {
  if (!startDate || !endDate) {
    return 'N/A';
  }
  
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);
  
  return `${start} - ${end}`;
}

/**
 * Get current user's date format preference
 */
export function getUserDateFormat(): string {
  try {
    const settings = getUserSettings();
    return settings.dateFormat;
  } catch (error) {
    return 'DD/MM/YYYY';
  }
}

/**
 * Get current user's time format preference
 */
export function getUserTimeFormat(): '12h' | '24h' {
  try {
    const settings = getUserSettings();
    return settings.timeFormat;
  } catch (error) {
    return '24h';
  }
}

/**
 * Get current user's language preference
 */
export function getUserLanguage(): string {
  try {
    const settings = getUserSettings();
    return settings.language;
  } catch (error) {
    return 'fr';
  }
}

/**
 * Get current user's timezone preference
 */
export function getUserTimezone(): string {
  try {
    const settings = getUserSettings();
    return settings.timezone;
  } catch (error) {
    return 'Europe/Paris';
  }
}

/**
 * Format month name (short) - e.g., "Jan", "Feb", "Mar"
 */
export function formatMonthShort(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      month: 'short'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      month: 'short'
    });
  } catch (error) {
    return dateObj.toLocaleDateString('fr-FR', {
      month: 'short'
    });
  }
}

/**
 * Format month and year (long) - e.g., "January 2025", "janvier 2025"
 */
export function formatMonthYear(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    return dateObj.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  }
}

/**
 * Format weekday name - e.g., "Monday", "Tuesday", "lundi", "mardi"
 */
export function formatWeekday(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      weekday: 'long'
    });
  } catch (error) {
    return dateObj.toLocaleDateString('fr-FR', {
      weekday: 'long'
    });
  }
}

/**
 * Format date in pretty format (similar to date-fns "PPP") - e.g., "January 16th, 2025"
 */
export function formatPrettyDate(date: string | Date | null | undefined): string {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  // Use default format during SSR
  if (typeof window === 'undefined') {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  try {
    const settings = getUserSettings();
    const locale = settings.formattingLocale ?? 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);

    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

/** Default IANA zone for server-side sync windows (matches `cleanTimezone` fallback). */
export const BUSINESS_TIMEZONE_EUROPE_PARIS = 'Europe/Paris';

const ymdKey = (p: { y: number; m: number; d: number }) => p.y * 10000 + p.m * 100 + p.d;

function addGregorianDays(y: number, m: number, d: number, delta: number): { y: number; m: number; d: number } {
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function daysInGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Calendar Y-M-D for an instant, in an IANA timezone (Intl only, no extra deps).
 */
export function getDatePartsInTimeZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

/** First UTC instant where the local calendar date in `timeZone` is (y, m, d). */
export function startOfZonedCalendarDayUtc(y: number, m: number, d: number, timeZone: string): Date {
  const target = ymdKey({ y, m, d });
  let lo = Date.UTC(y, m - 1, d) - 2 * 86400000;
  let hi = Date.UTC(y, m - 1, d) + 2 * 86400000;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const p = getDatePartsInTimeZone(new Date(mid), timeZone);
    const val = ymdKey(p);
    if (val < target) lo = mid + 1;
    else hi = mid;
  }
  return new Date(lo);
}

/** Start of the local calendar day in `timeZone` that contains `instant`. */
export function startOfZonedCalendarDayForInstant(instant: Date, timeZone: string): Date {
  const { y, m, d } = getDatePartsInTimeZone(instant, timeZone);
  return startOfZonedCalendarDayUtc(y, m, d, timeZone);
}

function endOfZonedCalendarDayForYmd(y: number, m: number, d: number, timeZone: string): Date {
  const next = addGregorianDays(y, m, d, 1);
  const nextStart = startOfZonedCalendarDayUtc(next.y, next.m, next.d, timeZone);
  return new Date(nextStart.getTime() - 1);
}

/** Last millisecond of the local calendar day in `timeZone` for `instant`’s local date. */
export function endOfZonedCalendarDay(instant: Date, timeZone: string): Date {
  const { y, m, d } = getDatePartsInTimeZone(instant, timeZone);
  return endOfZonedCalendarDayForYmd(y, m, d, timeZone);
}

/** Jan 1 00:00:00.000 local in `timeZone`, as UTC. */
export function startOfZonedYearJanFirstUtc(year: number, timeZone: string): Date {
  return startOfZonedCalendarDayUtc(year, 1, 1, timeZone);
}

/**
 * Split [start, end] into month-sized chunks using month boundaries in `timeZone`.
 * Mirrors the old server-local `getMonthlyDateRanges`: first chunk starts at midnight (in `timeZone`)
 * of the calendar day that contains `start`, then each next chunk starts on the 1st of the next month.
 */
export function getMonthlyZonedRanges(
  start: Date,
  end: Date,
  timeZone: string
): { startAt: string; endAt: string }[] {
  const ranges: { startAt: string; endAt: string }[] = [];
  let cur = startOfZonedCalendarDayForInstant(start, timeZone);

  while (cur.getTime() <= end.getTime()) {
    const { y, m } = getDatePartsInTimeZone(cur, timeZone);
    const dim = daysInGregorianMonth(y, m);
    const monthEnd = endOfZonedCalendarDayForYmd(y, m, dim, timeZone);
    const rangeEnd = monthEnd.getTime() > end.getTime() ? end : monthEnd;
    ranges.push({
      startAt: cur.toISOString(),
      endAt: rangeEnd.toISOString(),
    });
    const next = m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
    cur = startOfZonedCalendarDayUtc(next.y, next.m, 1, timeZone);
  }
  return ranges;
}
