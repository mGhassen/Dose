import type { SupabaseClient } from '@supabase/supabase-js';
import { formatRecoveryActionLabel, isBenignStopMessage, STOPPED_FOR_RECOVERY_MESSAGE } from '@kit/lib/sync-job-utils';
import { isFetchComplete } from '@/lib/sync-fetch-checkpoint';
import { stagingOptionsFromStats } from '@/lib/sync-period-utils';

export { formatRecoveryActionLabel, isBenignStopMessage, STOPPED_FOR_RECOVERY_MESSAGE };

export const STUCK_THRESHOLD_MS = 10 * 60 * 1000;
export const RUNNING_JOB_STATUSES = ['staging', 'pending', 'processing'] as const;
export const TERMINAL_RECOVERABLE_STATUSES = ['cancelled', 'stopped', 'failed', 'partially_imported'] as const;

export type RecoveryPhase = 'fetch' | 'review' | 'process' | 'terminal';
export type RecoveryAction = 'resume' | 'process_staged' | 'discard_staging' | 'cancel';
export type RecoveryActionKind = 'resume_fetch' | 'process_staged' | 'discard_staging';

export type StagingCounts = {
  staged_rows: number;
  unprocessed_rows: number;
  processed_rows: number;
};

export type LastStepInfo = {
  sequence: number;
  name: string;
  status: string;
} | null;

export type JobRecoveryState = {
  recovery_phase: RecoveryPhase;
  is_stuck: boolean;
  is_running: boolean;
  staging: StagingCounts;
  last_step: LastStepInfo;
  available_actions: RecoveryAction[];
  phase_label: string;
  review_redirect?: string;
  fetch_complete?: boolean;
};

type JobRow = {
  id: number;
  integration_id: number;
  sync_type: string;
  status: string;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  bulk_review_status?: string | null;
  parent_job_id?: number | null;
  recovery_action?: string | null;
  stats?: Record<string, unknown> | null;
};

type IntegrationRow = {
  integration_type: string;
};

type StepRow = {
  sequence: number;
  name: string;
  status: string;
  updated_at?: string;
  created_at?: string;
};

export function resolveStagingJobId(job: { id: number; parent_job_id?: number | null }): number {
  return job.parent_job_id ?? job.id;
}

export function isSuccessorMigrationError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes('parent_job_id') || lower.includes('recovery_action')) &&
    (lower.includes('does not exist') ||
      lower.includes('schema cache') ||
      lower.includes('column') ||
      lower.includes('could not find'))
  );
}

export type SuccessorSummary = {
  id: number;
  status: string;
  recovery_action?: string | null;
  created_at?: string;
};

export async function enrichJobsWithSuccessors<T extends { id: number }>(
  supabase: SupabaseClient,
  jobs: T[]
): Promise<(T & { successors?: SuccessorSummary[]; latest_successor?: SuccessorSummary | null })[]> {
  if (jobs.length === 0) return [];
  const parentIds = jobs.map((j) => j.id);
  const { data: successorRows } = await supabase
    .from('sync_jobs')
    .select('id, status, recovery_action, parent_job_id, created_at')
    .in('parent_job_id', parentIds)
    .order('created_at', { ascending: true });

  const byParent = new Map<number, SuccessorSummary[]>();
  for (const row of successorRows ?? []) {
    const parentId = row.parent_job_id as number;
    const list = byParent.get(parentId) ?? [];
    list.push({
      id: row.id as number,
      status: row.status as string,
      recovery_action: row.recovery_action as string | null,
      created_at: row.created_at as string,
    });
    byParent.set(parentId, list);
  }

  return jobs.map((job) => {
    const successors = byParent.get(job.id) ?? [];
    return {
      ...job,
      successors,
      latest_successor: successors.length > 0 ? successors[successors.length - 1] : null,
    };
  });
}

/** @deprecated Use enrichJobsWithSuccessors */
export async function enrichJobsWithLatestSuccessor<T extends { id: number }>(
  supabase: SupabaseClient,
  jobs: T[]
): Promise<(T & { latest_successor?: SuccessorSummary | null })[]> {
  const enriched = await enrichJobsWithSuccessors(supabase, jobs);
  return enriched.map(({ successors: _s, ...job }) => job as T & { latest_successor?: SuccessorSummary | null });
}

function isOlderThan(iso: string | null | undefined, ms: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > ms;
}

export function detectRecoveryPhase(job: JobRow, integration: IntegrationRow): RecoveryPhase {
  if (
    job.status === 'stopped' ||
    job.status === 'cancelled' ||
    job.status === 'completed' ||
    job.status === 'failed' ||
    job.status === 'partially_imported'
  ) {
    return 'terminal';
  }

  const bulkStatus = job.bulk_review_status ?? 'none';
  if (
    integration.integration_type === 'csv_bulk' &&
    (bulkStatus === 'needs_review' || bulkStatus === 'ready') &&
    job.status !== 'completed' &&
    job.status !== 'cancelled'
  ) {
    return 'review';
  }
  if (job.status === 'staging') return 'fetch';
  if (job.status === 'pending' || job.status === 'processing') return 'process';
  return 'terminal';
}

export function computeIsStuck(job: JobRow, phase: RecoveryPhase, steps: StepRow[]): boolean {
  if (phase === 'terminal') return false;

  if (phase === 'review') {
    return isOlderThan(job.created_at, STUCK_THRESHOLD_MS);
  }

  if (phase === 'fetch') {
    const runningStep = [...steps].reverse().find((s) => s.status === 'running');
    if (runningStep) {
      const ts = runningStep.updated_at ?? runningStep.created_at;
      if (isOlderThan(ts, STUCK_THRESHOLD_MS)) return true;
    }
    return isOlderThan(job.created_at, STUCK_THRESHOLD_MS);
  }

  if (phase === 'process') {
    const anchor = job.started_at ?? job.created_at;
    return isOlderThan(anchor, STUCK_THRESHOLD_MS);
  }

  return false;
}

function hasRunningSuccessor(successors: SuccessorSummary[] | undefined): boolean {
  return (successors ?? []).some((s) => RUNNING_JOB_STATUSES.includes(s.status as (typeof RUNNING_JOB_STATUSES)[number]));
}

export function getAvailableActions(
  phase: RecoveryPhase,
  staging: StagingCounts,
  jobStatus: string,
  job?: JobRow,
  successors?: SuccessorSummary[]
): RecoveryAction[] {
  const isTerminal = TERMINAL_RECOVERABLE_STATUSES.includes(
    jobStatus as (typeof TERMINAL_RECOVERABLE_STATUSES)[number]
  );

  if (isTerminal) {
    const actions: RecoveryAction[] = [];
    const fetchDone =
      job && isFetchComplete(job.stats ?? {}, job.sync_type, stagingOptionsFromStats(job.stats));

    if (!hasRunningSuccessor(successors)) {
      if (staging.unprocessed_rows > 0 || !fetchDone) {
        actions.push('resume');
      }
    }
    if (staging.unprocessed_rows > 0) {
      actions.push('discard_staging');
    }
    if (fetchDone && staging.unprocessed_rows > 0 && !hasRunningSuccessor(successors)) {
      actions.push('process_staged');
    }
    return actions;
  }

  if (phase === 'terminal') return [];

  const actions: RecoveryAction[] = ['resume', 'cancel'];
  const fetchDone =
    job && isFetchComplete(job.stats ?? {}, job.sync_type, stagingOptionsFromStats(job.stats));

  if (phase === 'fetch' && staging.staged_rows > 0 && fetchDone) {
    actions.splice(1, 0, 'process_staged');
  }

  if ((phase === 'fetch' || phase === 'process') && staging.unprocessed_rows > 0) {
    if (!actions.includes('discard_staging')) {
      actions.splice(1, 0, 'discard_staging');
    }
  } else if (phase === 'process' && staging.staged_rows > 0) {
    actions.push('discard_staging');
  }

  if (phase === 'review') {
    return ['resume', 'cancel'];
  }

  return actions;
}

export function getPhaseLabel(phase: RecoveryPhase, jobStatus: string): string {
  switch (phase) {
    case 'fetch':
      return 'Phase 1 — Fetching from source';
    case 'review':
      return 'Review — awaiting your edits';
    case 'process':
      return jobStatus === 'processing' ? 'Phase 2 — Processing' : 'Phase 2 — Pending';
    default:
      if (jobStatus === 'stopped') return 'Stopped';
      if (jobStatus === 'partially_imported') return 'Partially imported';
      if (jobStatus === 'cancelled') return 'Cancelled';
      return 'Completed';
  }
}

export async function fetchStagingCounts(
  supabase: SupabaseClient,
  stagingJobId: number,
  integrationType: string
): Promise<StagingCounts> {
  if (integrationType === 'square') {
    const { count: stagedTotal } = await supabase
      .from('sync_square_data')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', stagingJobId);
    const { count: unprocessed } = await supabase
      .from('sync_square_data')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', stagingJobId)
      .is('processed_at', null);
    const staged = stagedTotal ?? 0;
    const unprocessedRows = unprocessed ?? 0;
    return {
      staged_rows: staged,
      unprocessed_rows: unprocessedRows,
      processed_rows: Math.max(0, staged - unprocessedRows),
    };
  }

  const { count } = await supabase
    .from('sync_pennylane_data')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', stagingJobId);
  const staged = count ?? 0;
  return {
    staged_rows: staged,
    unprocessed_rows: staged,
    processed_rows: 0,
  };
}

/** @deprecated use deleteUnprocessedStagingForJob */
export async function deleteStagingForJob(
  supabase: SupabaseClient,
  stagingJobId: number,
  integrationType: string
): Promise<void> {
  await deleteUnprocessedStagingForJob(supabase, stagingJobId, integrationType);
}

export async function deleteUnprocessedStagingForJob(
  supabase: SupabaseClient,
  stagingJobId: number,
  integrationType: string
): Promise<number> {
  if (integrationType === 'square') {
    const { count } = await supabase
      .from('sync_square_data')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', stagingJobId)
      .is('processed_at', null);
    await supabase
      .from('sync_square_data')
      .delete()
      .eq('job_id', stagingJobId)
      .is('processed_at', null);
    return count ?? 0;
  }
  const { count } = await supabase
    .from('sync_pennylane_data')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', stagingJobId);
  await supabase.from('sync_pennylane_data').delete().eq('job_id', stagingJobId);
  return count ?? 0;
}

export async function getJobChainRootId(
  supabase: SupabaseClient,
  jobId: number
): Promise<number> {
  let current = jobId;
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase
      .from('sync_jobs')
      .select('parent_job_id')
      .eq('id', current)
      .maybeSingle();
    if (!data?.parent_job_id) return current;
    current = data.parent_job_id as number;
  }
  return current;
}

export async function getActiveSyncJobRoots(
  supabase: SupabaseClient,
  integrationId: number
): Promise<number[]> {
  const { data: active } = await supabase
    .from('sync_jobs')
    .select('id, parent_job_id')
    .eq('integration_id', integrationId)
    .in('status', [...RUNNING_JOB_STATUSES]);

  const roots = new Set<number>();
  for (const row of active ?? []) {
    const root = await getJobChainRootId(supabase, row.id as number);
    roots.add(root);
  }
  return [...roots];
}

export async function assertNoConflictingActiveJob(
  supabase: SupabaseClient,
  integrationId: number,
  jobId: number
): Promise<{ ok: true } | { ok: false; message: string; blockingJobId: number }> {
  const myRoot = await getJobChainRootId(supabase, jobId);
  const activeRoots = await getActiveSyncJobRoots(supabase, integrationId);
  const conflict = activeRoots.find((r) => r !== myRoot);
  if (conflict != null) {
    return {
      ok: false,
      message: `Job #${conflict} is still active for this integration. Cancel or wait before resuming job #${jobId}.`,
      blockingJobId: conflict,
    };
  }
  return { ok: true };
}

export function pickLastStep(steps: StepRow[]): LastStepInfo {
  if (steps.length === 0) return null;
  const sorted = [...steps].sort((a, b) => b.sequence - a.sequence);
  const last = sorted[0];
  return { sequence: last.sequence, name: last.name, status: last.status };
}

export function buildJobRecoveryState(
  job: JobRow,
  integration: IntegrationRow,
  staging: StagingCounts,
  steps: StepRow[],
  successors?: SuccessorSummary[]
): JobRecoveryState {
  const recovery_phase = detectRecoveryPhase(job, integration);
  const is_stuck = computeIsStuck(job, recovery_phase, steps);
  const is_running = RUNNING_JOB_STATUSES.includes(job.status as (typeof RUNNING_JOB_STATUSES)[number]);
  const available_actions = getAvailableActions(recovery_phase, staging, job.status, job, successors);
  const phase_label = getPhaseLabel(recovery_phase, job.status);
  const last_step = pickLastStep(steps);
  const fetch_complete = isFetchComplete(job.stats ?? {}, job.sync_type, stagingOptionsFromStats(job.stats));

  const state: JobRecoveryState = {
    recovery_phase,
    is_stuck,
    is_running,
    staging,
    last_step,
    available_actions,
    phase_label,
    fetch_complete,
  };

  if (recovery_phase === 'review') {
    state.review_redirect = `/settings/integrations/syncs/${job.id}/review`;
  }

  return state;
}

export async function getJobRecoveryState(
  supabase: SupabaseClient,
  job: JobRow,
  integration: IntegrationRow,
  steps: StepRow[],
  successors?: SuccessorSummary[]
): Promise<JobRecoveryState> {
  const stagingJobId = resolveStagingJobId(job);
  const staging = await fetchStagingCounts(supabase, stagingJobId, integration.integration_type);
  return buildJobRecoveryState(job, integration, staging, steps, successors);
}

export function fireProcessSyncJob(origin: string, jobId: number): void {
  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-cron-secret'] = secret;
  fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: 'POST', headers }).catch(() => {});
}

export async function stopJobForRecovery(
  supabase: SupabaseClient,
  jobId: number
): Promise<void> {
  await supabase
    .from('sync_jobs')
    .update({
      status: 'stopped',
      completed_at: new Date().toISOString(),
      error_message: STOPPED_FOR_RECOVERY_MESSAGE,
    })
    .eq('id', jobId);
}

export async function releaseIntegrationSyncLock(
  supabase: SupabaseClient,
  integrationId: number,
  jobId: number
): Promise<void> {
  await supabase
    .from('integrations')
    .update({ sync_active_job_id: null })
    .eq('id', integrationId)
    .eq('sync_active_job_id', jobId);
}
