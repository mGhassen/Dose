/**
 * Date serialization utilities - use these instead of toISOString() for YYYY-MM-DD
 * to respect user timezone and avoid UTC shift.
 */

const USER_SETTINGS_KEY = 'dose-user-settings';

/** IANA zone from user settings (or `NEXT_PUBLIC_TIMEZONE` / Europe/Paris on SSR). */
export function resolveUserTimeZoneForSession(): string {
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

function getTimeZone(): string {
  return resolveUserTimeZoneForSession();
}

/** `YYYY-MM-DD` as a **calendar** day in the browser’s local timezone (not UTC). Avoid `new Date("YYYY-MM-DD")` — that parses as UTC midnight and shifts the day in Europe. */
export function parseYYYYMMDDToLocalDate(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) throw new Error(`Invalid YYYY-MM-DD: ${ymd}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d);
}

export function formatYYYYMMDDParts(y: number, month: number, day: number): string {
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Convert a Date to YYYY-MM-DD string using the user's timezone.
 * Use this instead of toISOString().split('T')[0] to avoid UTC shift.
 */
export function dateToYYYYMMDD(d: Date, timeZone?: string): string {
  const tz = timeZone ?? getTimeZone();
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
}
