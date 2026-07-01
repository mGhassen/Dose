import { after, NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import {
  detectRecoveryPhase,
  fireProcessSyncJob,
  formatRecoveryActionLabel,
  getJobRecoveryState,
  isSuccessorMigrationError,
  type RecoveryAction,
  type RecoveryActionKind,
} from '@/lib/sync-job-recovery';
import { runStagingForJob } from '@/app/api/integrations/[id]/sync/sync-staging';
import { stagingOptionsFromStats, statsToPeriod } from '@/lib/sync-period-utils';

const VALID_ACTIONS: RecoveryAction[] = ['resume', 'process_staged', 'discard_staging', 'cancel'];

const RUNNING_STATUSES = ['staging', 'pending', 'processing'];

async function stopJob(supabase: ReturnType<typeof supabaseServer>, jobId: number): Promise<void> {
  await supabase
    .from('sync_jobs')
    .update({
      status: 'stopped',
      completed_at: new Date().toISOString(),
      error_message: 'Stopped by user for recovery',
    })
    .eq('id', jobId);
}

async function createSuccessorJob(
  supabase: ReturnType<typeof supabaseServer>,
  parentJob: {
    id: number;
    integration_id: number;
    sync_type: string;
    stats?: Record<string, unknown> | null;
  },
  recoveryAction: RecoveryActionKind,
  status: string
): Promise<number> {
  const { data, error } = await supabase
    .from('sync_jobs')
    .insert({
      integration_id: parentJob.integration_id,
      sync_type: parentJob.sync_type,
      status,
      parent_job_id: parentJob.id,
      recovery_action: recoveryAction,
      stats: parentJob.stats || {},
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
      .select('sequence, name, status, created_at, updated_at')
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

    if (action === 'cancel') {
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
        .update({ last_sync_status: null, last_sync_error: null })
        .eq('id', integrationId)
        .eq('last_sync_status', 'in_progress');

      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: null,
        successor_job_id: null,
        action,
        message: 'Job cancelled.',
      });
    }

    const phase = detectRecoveryPhase(job, integration);

    if (!RUNNING_STATUSES.includes(job.status)) {
      return NextResponse.json({ error: 'Only running jobs can be stopped for recovery' }, { status: 400 });
    }

    if (action === 'process_staged' && phase !== 'fetch') {
      return NextResponse.json(
        { error: 'process_staged is only available while job is in staging fetch phase' },
        { status: 400 }
      );
    }

    await stopJob(supabase, numericJobId);
    await supabase
      .from('integrations')
      .update({ last_sync_status: null, last_sync_error: null })
      .eq('id', integrationId)
      .eq('last_sync_status', 'in_progress');

    if (action === 'discard_staging') {
      const successorId = await createSuccessorJob(supabase, job, 'discard_staging', 'processing');
      fireProcessSyncJob(origin, successorId);
      return NextResponse.json({
        job_id: numericJobId,
        stopped_job_id: numericJobId,
        successor_job_id: successorId,
        action,
        redirect: recoveryRedirect(successorId),
        message: recoveryMessage(numericJobId, successorId, 'discard_staging'),
      });
    }

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
      const stagingOptions = stagingOptionsFromStats(job.stats);

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
          job.stats as Record<string, unknown>
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
  } catch (error: any) {
    console.error('Error recovering sync job:', error);
    const message = error?.message || 'Failed to recover job';
    const status = isSuccessorMigrationError(message) ? 503 : 500;
    return NextResponse.json(
      { error: message, details: message },
      { status }
    );
  }
}
