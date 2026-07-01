import type { SupabaseClient } from '@supabase/supabase-js';
import { formatRecoveryActionLabel, isBenignStopMessage, STOPPED_FOR_RECOVERY_MESSAGE } from '@kit/lib/sync-job-utils';

export { formatRecoveryActionLabel, isBenignStopMessage, STOPPED_FOR_RECOVERY_MESSAGE };

export const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

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
};

export async function enrichJobsWithLatestSuccessor<T extends { id: number }>(
  supabase: SupabaseClient,
  jobs: T[]
): Promise<(T & { latest_successor?: SuccessorSummary | null })[]> {
  if (jobs.length === 0) return [];
  const parentIds = jobs.map((j) => j.id);
  const { data: successors } = await supabase
    .from('sync_jobs')
    .select('id, status, recovery_action, parent_job_id, created_at')
    .in('parent_job_id', parentIds)
    .order('created_at', { ascending: false });

  const latestByParent = new Map<number, SuccessorSummary>();
  for (const row of successors ?? []) {
    const parentId = row.parent_job_id as number;
    if (!latestByParent.has(parentId)) {
      latestByParent.set(parentId, {
        id: row.id as number,
        status: row.status as string,
        recovery_action: row.recovery_action as string | null,
      });
    }
  }

  return jobs.map((job) => ({
    ...job,
    latest_successor: latestByParent.get(job.id) ?? null,
  }));
}

function isOlderThan(iso: string | null | undefined, ms: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() > ms;
}

export function detectRecoveryPhase(
  job: JobRow,
  integration: IntegrationRow
): RecoveryPhase {
  if (job.status === 'stopped' || job.status === 'cancelled' || job.status === 'completed' || job.status === 'failed') {
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

export function computeIsStuck(
  job: JobRow,
  phase: RecoveryPhase,
  steps: StepRow[]
): boolean {
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

export function getAvailableActions(
  phase: RecoveryPhase,
  staging: StagingCounts,
  jobStatus: string
): RecoveryAction[] {
  if (phase === 'terminal') return [];

  const actions: RecoveryAction[] = ['resume', 'cancel'];

  if (phase === 'fetch' && staging.staged_rows > 0) {
    actions.splice(1, 0, 'process_staged', 'discard_staging');
  }

  if (phase === 'process' && staging.staged_rows > 0) {
    actions.push('discard_staging');
  }

  if (phase === 'review') {
    return ['resume', 'cancel'];
  }

  if (jobStatus === 'stopped') {
    return [];
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

export async function deleteStagingForJob(
  supabase: SupabaseClient,
  stagingJobId: number,
  integrationType: string
): Promise<void> {
  if (integrationType === 'square') {
    await supabase.from('sync_square_data').delete().eq('job_id', stagingJobId);
  } else {
    await supabase.from('sync_pennylane_data').delete().eq('job_id', stagingJobId);
  }
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
  steps: StepRow[]
): JobRecoveryState {
  const recovery_phase = detectRecoveryPhase(job, integration);
  const is_stuck = computeIsStuck(job, recovery_phase, steps);
  const is_running =
    job.status === 'staging' || job.status === 'pending' || job.status === 'processing';
  const available_actions = getAvailableActions(recovery_phase, staging, job.status);
  const phase_label = getPhaseLabel(recovery_phase, job.status);
  const last_step = pickLastStep(steps);

  const state: JobRecoveryState = {
    recovery_phase,
    is_stuck,
    is_running,
    staging,
    last_step,
    available_actions,
    phase_label,
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
  steps: StepRow[]
): Promise<JobRecoveryState> {
  const stagingJobId = resolveStagingJobId(job);
  const staging = await fetchStagingCounts(supabase, stagingJobId, integration.integration_type);
  return buildJobRecoveryState(job, integration, staging, steps);
}

export function fireProcessSyncJob(origin: string, jobId: number): void {
  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-cron-secret'] = secret;
  fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: 'POST', headers }).catch(() => {});
}
