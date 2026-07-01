import {
  BUSINESS_TIMEZONE_EUROPE_PARIS,
  endOfZonedCalendarDay,
  getDatePartsInTimeZone,
  getMonthlyZonedRanges,
  startOfZonedYearJanFirstUtc,
} from '@kit/lib/date-format';

export type FullSyncPeriod = {
  mode: 'last_sync' | 'custom' | 'all';
  startAt?: string;
  endAt?: string;
};

export type SyncPeriodStats = {
  mode: FullSyncPeriod['mode'];
  start_at?: string;
  end_at?: string;
};

export type SquareStagingOptions = {
  includeCatalog?: boolean;
  includeLocations?: boolean;
};

const SYNC_TZ = BUSINESS_TIMEZONE_EUROPE_PARIS;
const LOOKBACK_YEARS = 7;

export function resolveFullSyncRange(
  integration: { last_sync_at?: string | null },
  period: FullSyncPeriod | undefined
): { start: Date; end: Date } {
  const now = new Date();
  const defaultEnd = endOfZonedCalendarDay(now, SYNC_TZ);
  const mode = period?.mode ?? 'all';

  if (mode === 'custom' && period?.startAt && period?.endAt) {
    return { start: new Date(period.startAt), end: new Date(period.endAt) };
  }
  if (mode === 'last_sync' && integration.last_sync_at) {
    return { start: new Date(integration.last_sync_at), end: defaultEnd };
  }
  const { y } = getDatePartsInTimeZone(now, SYNC_TZ);
  return { start: startOfZonedYearJanFirstUtc(y - LOOKBACK_YEARS, SYNC_TZ), end: defaultEnd };
}

export function countMonthsInSyncPeriod(
  integration: { last_sync_at?: string | null },
  period: FullSyncPeriod | undefined
): number {
  const { start, end } = resolveFullSyncRange(integration, period);
  return getMonthlyZonedRanges(start, end, SYNC_TZ).length;
}

export function getMonthlyRangesForSyncPeriod(
  integration: { last_sync_at?: string | null },
  period: FullSyncPeriod | undefined
): { startAt: string; endAt: string; monthLabel: string }[] {
  const { start, end } = resolveFullSyncRange(integration, period);
  return getMonthlyZonedRanges(start, end, SYNC_TZ).map((r) => ({
    ...r,
    monthLabel: new Date(r.startAt).toISOString().slice(0, 7),
  }));
}

export function periodToStats(period: FullSyncPeriod): SyncPeriodStats {
  return {
    mode: period.mode,
    ...(period.startAt ? { start_at: period.startAt } : {}),
    ...(period.endAt ? { end_at: period.endAt } : {}),
  };
}

export function statsToPeriod(stats: Record<string, unknown> | null | undefined): FullSyncPeriod | undefined {
  const sp = stats?.sync_period as SyncPeriodStats | undefined;
  if (!sp?.mode) return undefined;
  return {
    mode: sp.mode,
    startAt: sp.start_at,
    endAt: sp.end_at,
  };
}

export function stagingOptionsFromStats(stats: Record<string, unknown> | null | undefined): SquareStagingOptions {
  return {
    includeCatalog: stats?.include_catalog !== false,
    includeLocations: stats?.include_locations !== false,
  };
}
