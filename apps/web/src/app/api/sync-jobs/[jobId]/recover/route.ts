import { after, NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import {
  assertNoConflictingActiveJob,
  detectRecoveryPhase,
  fetchStagingCounts,
  fireProcessSyncJob,
  formatRecoveryActionLabel,
  getJobRecoveryState,
  isSuccessorMigrationError,
  resolveStagingJobId,
  RUNNING_JOB_STATUSES,
  stopJobForRecovery,
  TERMINAL_RECOVERABLE_STATUSES,
  type RecoveryAction,
  type RecoveryActionKind,
} from '@/lib/sync-job-recovery';
import { isFetchComplete, resolveFetchCheckpoint } from '@/lib/sync-fetch-checkpoint';
import { runStagingForJob } from '@/app/api/integrations/[id]/sync/sync-staging';
import { stagingOptionsFromStats, statsToPeriod } from '@/lib/sync-period-utils';

const VALID_ACTIONS: RecoveryAction[] = ['resume', 'process_staged', 'discard_staging', 'cancel'];

async function createSuccessorJob(
  supabase: ReturnType<typeof supabaseServer>,
  parentJob: {
    id: number;
    integration_id: number;
    sync_type: string;
    stats?: Record<string, unknown> | null;
  },
  recoveryAction: RecoveryActionKind,
  status: string,
  statsOverride?: Record<string, unknown>
): Promise<number> {
  const { data, error } = await supabase
    .from('sync_jobs')
    .insert({
      integration_id: parentJob.integration_id,
      sync_type: parentJob.sync_type,
      status,
      parent_job_id: parentJob.id,
      recovery_action: recoveryAction,
      stats: statsOverride ?? parentJob.stats ?? {},
    })
    .select('id')
    .single();
  if (error || !data) {
    const msg = error?.message || 'Failed to create successor job';
    if (isSuccessorMigrationError(msg)) {
      throw new Error(
        'Database migration required: run sync_job_successor_fields (parent_job_id, recovery_action).'
      );
    }
    throw new Error(msg);
  }
  return data.id as number;
}

function recoveryRedirect(successorId: number): string {
  return `/settings/integrations/syncs/${successorId}`;
}

function recoveryMessage(
  stoppedId: number,
  successorId: number,
  recoveryAction: RecoveryActionKind
): string {
  const label = formatRecoveryActionLabel(recoveryAction) ?? recoveryAction;
  return `Job #${stoppedId} stopped. Job #${successorId} started (${label}).`;
}

function terminalRecoveryMessage(
  parentId: number,
  successorId: number,
  recoveryAction: RecoveryActionKind
): string {
  const label = formatRecoveryActionLabel(recoveryAction) ?? recoveryAction;
  return `Job #${parentId}: successor #${successorId} started (${label}).`;
}

function inferResumePhase(
  job: { status: string; stats?: Record<string, unknown> | null; sync_type: string },
  integrationPhase: ReturnType<typeof detectRecoveryPhase>
): 'fetch' | 'process' {
  if (RUNNING_JOB_STATUSES.includes(job.status as (typeof RUNNING_JOB_STATUSES)[number])) {
    if (integrationPhase === 'process') return 'process';
    return 'fetch';
  }
  const stats = job.stats ?? {};
  const options = stagingOptionsFromStats(stats);
  if (isFetchComplete(stats, job.sync_type, options)) return 'process';
  return 'fetch';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const supabase = supabaseServer();
    const access = await getSyncJobWithIntegrationForUser(supabase, jobId, token);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const job = access.job as {
      id: number;
      integration_id: number;
      sync_type: string;
      status: string;
      created_at: string;
      started_at?: string | null;
      bulk_review_status?: string | null;
      stats?: Record<string, unknown>;
      parent_job_id?: number | null;
    };
    const integration = access.integration;

    const body = await request.json().catch(() => ({}));
    const action = body.action as RecoveryAction;
    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: steps } = await supabase
      .from('sync_job_steps')
      .select('sequence, name, status, details, created_at, updated_at')
      .eq('job_id', jobId)
      .order('sequence', { ascending: true });

    const recovery = await getJobRecoveryState(supabase, job, integration, steps || []);

    if (!recovery.available_actions.includes(action)) {
      return NextResponse.json(
        { error: `Action "${action}" is not available for this job in phase "${recovery.recovery_phase}"` },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin;
    const integrationId = integration.id as number;
    const numericJobId = job.id;
    const isTerminal = TERMINAL_RECOVERABLE_STATUSES.includes(
      job.status as (typeof TERMINAL_RECOVERABLE_STATUSES)[number]
    );
    const isRunning = RUNNING_JOB_STATUSES.includes(job.status as (typeof RUNNING_JOB_STATUSES)[number]);
    const stagingJobId = resolveStagingJobId(job);
    const stagingOptions = stagingOptionsFromStats(job.stats);

    if (action === 'cancel') {
      if (!isRunning) {
        return NextResponse.json({ error: 'Only running jobs can be cancelled' }, { status: 400 });
      }
      const updates: Record<string, unknown> = {
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        error_message: 'Cancelled by user',
      };
      if (integration.integration_type === 'csv_bulk') {
        updates.bulk_review_status = 'cancelled';
      }
      await supabase.from('sync_jobs').update(updates).eq('id', numericJobId);
      await supabase
        .from('integrations')
        .update({ last_sync_status: null, last_sync_error: null, sync_active_job_id: null })
        .eq('id', integrationId)
        .eq('sync_active_job_id', numericJobId);

      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: null,
        successor_job_id: null,
        action,
        message: 'Job cancelled.',
      });
    }

    if (action === 'process_staged' && !isFetchComplete(job.stats ?? {}, job.sync_type, stagingOptions)) {
      return NextResponse.json(
        { error: 'Cannot process staged data until fetch is complete for the requested period' },
        { status: 400 }
      );
    }

    if (action === 'resume' || action === 'process_staged') {
      const conflict = await assertNoConflictingActiveJob(supabase, integrationId, numericJobId);
      if (!conflict.ok) {
        return NextResponse.json({ error: conflict.message }, { status: 409 });
      }
    }

    const phase = detectRecoveryPhase(job, integration);

    if (action === 'discard_staging') {
      const stagingBefore = await fetchStagingCounts(supabase, stagingJobId, integration.integration_type);
      if (isRunning) {
        await stopJobForRecovery(supabase, numericJobId);
        await supabase
          .from('integrations')
          .update({ sync_active_job_id: null })
          .eq('id', integrationId)
          .eq('sync_active_job_id', numericJobId);
      }

      const successorId = await createSuccessorJob(supabase, job, 'discard_staging', 'processing', {
        ...(job.stats ?? {}),
        discard_snapshot: {
          unprocessed_to_delete: stagingBefore.unprocessed_rows,
          processed_retained: stagingBefore.processed_rows,
        },
      });

      if (stagingBefore.processed_rows > 0) {
        await supabase
          .from('sync_jobs')
          .update({ status: 'partially_imported', completed_at: new Date().toISOString() })
          .eq('id', numericJobId);
      }

      fireProcessSyncJob(origin, successorId);
      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: isRunning ? numericJobId : null,
        successor_job_id: successorId,
        action,
        redirect: recoveryRedirect(successorId),
        message: isRunning
          ? recoveryMessage(numericJobId, successorId, 'discard_staging')
          : terminalRecoveryMessage(numericJobId, successorId, 'discard_staging'),
      });
    }

    if (isTerminal) {
      if (action === 'process_staged') {
        const successorId = await createSuccessorJob(supabase, job, 'process_staged', 'pending');
        fireProcessSyncJob(origin, successorId);
        return NextResponse.json({
          job_id: numericJobId,
          successor_job_id: successorId,
          action,
          redirect: recoveryRedirect(successorId),
          message: terminalRecoveryMessage(numericJobId, successorId, 'process_staged'),
        });
      }

      if (action === 'resume') {
        const { data: fullIntegration } = await supabase
          .from('integrations')
          .select('*')
          .eq('id', integrationId)
          .single();
        if (!fullIntegration) {
          return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
        }

        const resumePhase = inferResumePhase(job, phase);
        const period = statsToPeriod(job.stats);
        const checkpoint = resolveFetchCheckpoint(job.stats, steps ?? []);

        if (resumePhase === 'process') {
          const successorId = await createSuccessorJob(supabase, job, 'process_staged', 'pending');
          fireProcessSyncJob(origin, successorId);
          return NextResponse.json({
            job_id: numericJobId,
            successor_job_id: successorId,
            action,
            redirect: recoveryRedirect(successorId),
            message: terminalRecoveryMessage(numericJobId, successorId, 'process_staged'),
          });
        }

        const successorId = await createSuccessorJob(supabase, job, 'resume_fetch', 'staging');
        after(async () => {
          const supabaseBg = supabaseServer();
          await runStagingForJob(
            supabaseBg,
            fullIntegration,
            successorId,
            job.sync_type,
            origin,
            period,
            stagingJobId,
            stagingOptions,
            job.stats as Record<string, unknown>,
            checkpoint ?? undefined
          );
        });

        return NextResponse.json({
          job_id: numericJobId,
          successor_job_id: successorId,
          action,
          redirect: recoveryRedirect(successorId),
          message: terminalRecoveryMessage(numericJobId, successorId, 'resume_fetch'),
        });
      }
    }

    if (!isRunning) {
      return NextResponse.json({ error: 'Job is not in a recoverable running state' }, { status: 400 });
    }

    if (action === 'process_staged' && phase !== 'fetch') {
      return NextResponse.json(
        { error: 'process_staged is only available while job is in staging fetch phase' },
        { status: 400 }
      );
    }

    await stopJobForRecovery(supabase, numericJobId);
    await supabase
      .from('integrations')
      .update({ last_sync_status: null, last_sync_error: null, sync_active_job_id: null })
      .eq('id', integrationId)
      .eq('sync_active_job_id', numericJobId);

    if (action === 'process_staged') {
      const successorId = await createSuccessorJob(supabase, job, 'process_staged', 'pending');
      fireProcessSyncJob(origin, successorId);
      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: numericJobId,
        successor_job_id: successorId,
        action,
        redirect: recoveryRedirect(successorId),
        message: recoveryMessage(numericJobId, successorId, 'process_staged'),
      });
    }

    if (phase === 'review' && recovery.review_redirect) {
      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: numericJobId,
        successor_job_id: null,
        action,
        redirect: recovery.review_redirect,
        message: 'Job stopped. Continue on the review page.',
      });
    }

    if (phase === 'fetch') {
      const { data: fullIntegration } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .single();
      if (!fullIntegration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      const period = statsToPeriod(job.stats);
      const checkpoint = resolveFetchCheckpoint(job.stats, steps ?? []);
      const successorId = await createSuccessorJob(supabase, job, 'resume_fetch', 'staging');

      after(async () => {
        const supabaseBg = supabaseServer();
        await runStagingForJob(
          supabaseBg,
          fullIntegration,
          successorId,
          job.sync_type,
          origin,
          period,
          numericJobId,
          stagingOptions,
          job.stats as Record<string, unknown>,
          checkpoint ?? undefined
        );
      });

      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: numericJobId,
        successor_job_id: successorId,
        action,
        redirect: recoveryRedirect(successorId),
        message: recoveryMessage(numericJobId, successorId, 'resume_fetch'),
      });
    }

    if (phase === 'process') {
      const successorId = await createSuccessorJob(supabase, job, 'process_staged', 'pending');
      fireProcessSyncJob(origin, successorId);
      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: numericJobId,
        successor_job_id: successorId,
        action,
        redirect: recoveryRedirect(successorId),
        message: recoveryMessage(numericJobId, successorId, 'process_staged'),
      });
    }

    return NextResponse.json(
      { error: 'No recovery action available for this job state' },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Error recovering sync job:', error);
    const message = error instanceof Error ? error.message : 'Failed to recover job';
    const status = isSuccessorMigrationError(message) ? 503 : 500;
    return NextResponse.json({ error: message, details: message }, { status });
  }
}
