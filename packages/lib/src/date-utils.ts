/**
 * Date serialization utilities - use these instead of toISOString() for YYYY-MM-DD
 * to respect user timezone and avoid UTC shift.
 */

const USER_SETTINGS_KEY = 'dose-user-settings';

function getTimeZone(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_TIMEZONE || 'Europe/Paris';
  }
  try {
    const stored = localStorage.getItem(USER_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const tz = parsed?.timezone?.replace(/^(for|to|in)/, '').trim();
      if (tz && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(tz)) return tz;
    }
  } catch {
    /* ignore */
  }
  return process.env.NEXT_PUBLIC_TIMEZONE || 'Europe/Paris';
}

/**
 * Convert a Date to YYYY-MM-DD string using the user's timezone.
 * Use this instead of toISOString().split('T')[0] to avoid UTC shift.
 */
export function dateToYYYYMMDD(d: Date, timeZone?: string): string {
  const tz = timeZone ?? getTimeZone();
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
}
