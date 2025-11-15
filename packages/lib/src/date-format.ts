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
  const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
  
  // Clean the timezone value to remove any potential prefixes
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);
    
    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    // Fallback to consistent format if settings can't be loaded
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
    const cleanedTimezone = cleanTimezone(settings.timezone);
    
    return dateObj.toLocaleDateString(locale, {
      timeZone: cleanedTimezone,
      day: '2-digit',
      month: 'short'
    });
  } catch (error) {
    // Fallback to consistent format if settings can't be loaded
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
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
    const locale = settings.language === 'en' ? 'en-US' : 'fr-FR';
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
