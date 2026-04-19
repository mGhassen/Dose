import { appDefaultTimeZone, inclusiveUtcRangeFromYmdStrings } from './date-format';

/** PostgREST `.gte('date', …).lte('date', …)` on timestamptz from inclusive YYYY-MM-DD range in app TZ. */
export function timestamptzBoundsFromYmdRange(
  startYmd: string,
  endYmd: string
): { gte: string; lte: string } {
  const tz = appDefaultTimeZone();
  const { startUtc, endUtc } = inclusiveUtcRangeFromYmdStrings(startYmd, endYmd, tz);
  return { gte: startUtc.toISOString(), lte: endUtc.toISOString() };
}

/** Last calendar day YYYY-MM-DD for Gregorian month `YYYY-MM` (length does not depend on TZ). */
export function lastDayYmdForYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) throw new Error(`Invalid YYYY-MM: ${ym}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error(`Invalid month in YYYY-MM: ${ym}`);
  const last = new Date(y, mo, 0).getDate();
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

export function timestamptzBoundsForYm(monthYm: string): { gte: string; lte: string } {
  return timestamptzBoundsFromYmdRange(`${monthYm}-01`, lastDayYmdForYm(monthYm));
}

/** Inclusive day count between two calendar YYYY-MM-DD strings (Gregorian). */
export function inclusiveDaysBetweenYmd(startYmd: string, endYmd: string): number {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startYmd.trim());
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endYmd.trim());
  if (!a || !b) return 1;
  const s = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const e = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
}
