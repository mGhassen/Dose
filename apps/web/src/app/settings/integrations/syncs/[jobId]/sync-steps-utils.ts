import type { SyncJobFamilyMember, SyncFamilyStep } from '@kit/types';

export function isFetchStep(name: string): boolean {
  return (
    name.startsWith('Catalog —') ||
    name.startsWith('Orders —') ||
    name.startsWith('Payments —') ||
    name === 'Fetch catalog' ||
    name === 'Fetch orders' ||
    name === 'Fetch payments' ||
    name.startsWith('Transactions —')
  );
}

export function stepDetailsText(details?: Record<string, unknown> | null): string {
  if (!details || typeof details !== 'object') return '';
  if (typeof details.api_count === 'number') {
    const parts = [`${details.api_count} from API`];
    if (typeof details.inserted === 'number') parts.push(`${details.inserted} inserted`);
    if (typeof details.skipped_duplicates === 'number' && details.skipped_duplicates > 0) {
      parts.push(`${details.skipped_duplicates} skipped`);
    }
    if (typeof details.verified_db_count === 'number') {
      parts.push(`${details.verified_db_count} verified`);
    }
    return parts.join(' · ');
  }
  const parts = Object.entries(details)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v !== ''))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
  return parts.join(', ');
}

export function jobDisplayLabel(job: SyncJobFamilyMember): string {
  if (job.recovery_action) return `#${job.id} recovery`;
  if (job.batch_role === 'catalog') return `#${job.id} Catalog`;
  if (job.month_label) return `#${job.id} ${job.month_label}`;
  return `#${job.id} ${job.sync_type}`;
}

export function jobShortLabel(job: SyncJobFamilyMember): string {
  if (job.recovery_action) return 'recovery';
  if (job.batch_role === 'catalog') return 'Catalog';
  if (job.month_label) return job.month_label;
  return job.sync_type;
}

export function filterSteps(
  steps: SyncFamilyStep[],
  filters: {
    status: string;
    phase: string;
    search: string;
    errorsOnly: boolean;
    jobIds: number[] | null;
  }
): SyncFamilyStep[] {
  return steps.filter((step) => {
    if (filters.jobIds && !filters.jobIds.includes(step.job_id)) return false;
    if (filters.status !== 'all' && step.status !== filters.status) return false;
    if (filters.phase === 'fetch' && !isFetchStep(step.name)) return false;
    if (filters.phase === 'process' && isFetchStep(step.name)) return false;
    if (filters.search && !step.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.errorsOnly && step.error_count === 0 && step.status !== 'failed') return false;
    return true;
  });
}

export function buildTimelineBuckets(
  steps: SyncFamilyStep[],
  bucketCount = 24
): { start: number; end: number; count: number; failed: number }[] {
  if (steps.length === 0) return [];
  const times = steps.map((s) => new Date(s.updated_at || s.created_at).getTime()).filter((t) => !Number.isNaN(t));
  if (times.length === 0) return [];
  const min = Math.min(...times);
  const max = Math.max(...times);
  const range = Math.max(max - min, 1);
  const bucketSize = range / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: min + i * bucketSize,
    end: min + (i + 1) * bucketSize,
    count: 0,
    failed: 0,
  }));
  for (const step of steps) {
    const t = new Date(step.updated_at || step.created_at).getTime();
    const idx = Math.min(Math.floor((t - min) / bucketSize), bucketCount - 1);
    buckets[idx].count += 1;
    if (step.status === 'failed' || step.error_count > 0) buckets[idx].failed += 1;
  }
  return buckets;
}

export function payloadPreview(payload: unknown): string {
  if (payload == null) return '';
  try {
    const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return s.length > 120 ? `${s.slice(0, 120)}…` : s;
  } catch {
    return String(payload);
  }
}
