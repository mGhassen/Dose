import {
  type FullSyncPeriod,
  type SquareStagingOptions,
  getMonthlyRangesForSyncPeriod,
  resolveFullSyncRange,
} from '@/lib/sync-period-utils';

export type FetchPhase = 'catalog' | 'orders' | 'payments';

export type FetchPlan = {
  end_at: string;
  months: string[];
  phases: FetchPhase[];
  month_label?: string;
};

export type MonthPhaseStatus = 'pending' | 'incomplete' | 'complete';

export type FetchCoverage = Record<
  string,
  { orders?: MonthPhaseStatus; payments?: MonthPhaseStatus; catalog?: MonthPhaseStatus }
>;

export type FetchProgress = {
  phase: FetchPhase;
  month_label?: string;
  page: number;
  next_cursor: string | null;
  completed_phases: FetchPhase[];
};

export type FetchCheckpoint = FetchProgress | null;

export type StepDetailsRow = {
  name: string;
  status: string;
  details?: Record<string, unknown> | null;
};

export function buildFetchPlan(
  integration: { last_sync_at?: string | null },
  period: FullSyncPeriod | undefined,
  syncType: string,
  stagingOptions: SquareStagingOptions = {}
): FetchPlan {
  const { end } = resolveFullSyncRange(integration, period);
  const months = getMonthlyRangesForSyncPeriod(integration, period).map((r) => r.monthLabel);
  const phases: FetchPhase[] = [];
  const includeCatalog = stagingOptions.includeCatalog !== false;
  if (includeCatalog && (syncType === 'catalog' || syncType === 'full')) phases.push('catalog');
  if (syncType === 'orders' || syncType === 'full') phases.push('orders');
  if (syncType === 'payments' || syncType === 'full') phases.push('payments');
  const monthLabel = (period as { month_label?: string } | undefined)?.month_label;
  return {
    end_at: end.toISOString(),
    months,
    phases,
    ...(monthLabel ? { month_label: monthLabel } : {}),
  };
}

function parseStepMonth(name: string): string | null {
  const m = /^(?:Orders|Payments) — (\d{4}-\d{2}) —/.exec(name);
  return m?.[1] ?? null;
}

export function resolveFetchCheckpoint(
  stats: Record<string, unknown> | null | undefined,
  steps: StepDetailsRow[]
): FetchCheckpoint {
  const progress = stats?.fetch_progress as FetchProgress | undefined;
  if (progress?.phase) return progress;

  const fetchSteps = steps.filter((s) =>
    s.name.startsWith('Catalog') ||
    s.name.startsWith('Orders') ||
    s.name.startsWith('Payments') ||
    s.name === 'Fetch catalog' ||
    s.name === 'Fetch orders' ||
    s.name === 'Fetch payments'
  );
  if (fetchSteps.length === 0) return null;

  const sorted = [...fetchSteps];
  const lastStep = sorted[sorted.length - 1];
  const details = (lastStep.details ?? {}) as Record<string, unknown>;
  const next_cursor =
    details.next_cursor === undefined ? null : (details.next_cursor as string | null);

  let phase: FetchPhase = 'catalog';
  if (lastStep.name.startsWith('Orders') || lastStep.name === 'Fetch orders') phase = 'orders';
  if (lastStep.name.startsWith('Payments') || lastStep.name === 'Fetch payments') phase = 'payments';

  const completed_phases: FetchPhase[] = [];
  if (fetchSteps.some((s) => s.name.startsWith('Catalog') || s.name === 'Fetch catalog')) {
    const catalogDone = !fetchSteps.some((s) => s.name.startsWith('Catalog') && s.status === 'running');
    if (catalogDone && phase !== 'catalog') completed_phases.push('catalog');
  }
  if (phase === 'payments') {
    if (!completed_phases.includes('catalog')) completed_phases.push('catalog');
    completed_phases.push('orders');
  }
  if (phase === 'orders' && !completed_phases.includes('catalog')) {
    completed_phases.push('catalog');
  }

  const pageMatch = /page (\d+)/.exec(lastStep.name);
  return {
    phase,
    month_label: parseStepMonth(lastStep.name) ?? undefined,
    page: pageMatch ? Number(pageMatch[1]) : 0,
    next_cursor: lastStep.status === 'done' && next_cursor === null ? null : next_cursor,
    completed_phases,
  };
}

export function isFetchComplete(
  stats: Record<string, unknown> | null | undefined,
  syncType: string,
  stagingOptions: SquareStagingOptions = {}
): boolean {
  if (stats?.fetch_complete === true) return true;

  const plan = stats?.fetch_plan as FetchPlan | undefined;
  const includeCatalog = stagingOptions.includeCatalog !== false;

  if (syncType === 'catalog') {
    return Boolean(stats?.catalog_complete);
  }

  if (!plan?.months?.length && syncType !== 'payments' && syncType !== 'orders') {
    return Boolean(stats?.catalog_complete);
  }

  const coverage = (stats?.fetch_coverage ?? {}) as FetchCoverage;

  if (includeCatalog && (syncType === 'full') && plan?.phases?.includes('catalog')) {
    if (!stats?.catalog_complete) return false;
  }

  const months = plan?.months ?? [];
  for (const month of months) {
    const row = coverage[month] ?? {};
    if ((syncType === 'orders' || syncType === 'full') && plan?.phases?.includes('orders')) {
      if (row.orders !== 'complete') return false;
    }
    if ((syncType === 'payments' || syncType === 'full') && plan?.phases?.includes('payments')) {
      if (row.payments !== 'complete') return false;
    }
  }

  if (syncType === 'orders' && months.length === 0) return true;
  if (syncType === 'payments' && months.length === 0) return true;

  return months.length > 0 || syncType === 'catalog';
}

export function monthCompare(a: string, b: string): number {
  return a.localeCompare(b);
}

const phaseOrder: Record<FetchPhase, number> = { catalog: 0, orders: 1, payments: 2 };

export function shouldSkipMonth(checkpoint: FetchCheckpoint, phase: FetchPhase, monthLabel: string): boolean {
  if (!checkpoint) return false;
  const completed = checkpoint.completed_phases ?? [];
  if (completed.includes(phase)) return true;
  if (phaseOrder[phase] < phaseOrder[checkpoint.phase]) return true;
  if (phaseOrder[phase] > phaseOrder[checkpoint.phase]) return false;
  if (!checkpoint.month_label) return false;
  return monthCompare(monthLabel, checkpoint.month_label) < 0;
}

export function initialCursorForMonth(
  checkpoint: FetchCheckpoint,
  phase: FetchPhase,
  monthLabel: string
): string | null {
  if (!checkpoint || checkpoint.phase !== phase || checkpoint.month_label !== monthLabel) return null;
  return checkpoint.next_cursor ?? null;
}

export function markMonthPhaseComplete(
  coverage: FetchCoverage,
  month: string,
  phase: 'orders' | 'payments'
): FetchCoverage {
  return {
    ...coverage,
    [month]: { ...coverage[month], [phase]: 'complete' },
  };
}
