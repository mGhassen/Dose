import { after, NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import {
  detectRecoveryPhase,
  fireProcessSyncJob,
  getJobRecoveryState,
  type RecoveryAction,
} from '@/lib/sync-job-recovery';
import {
  completeStagingAndQueueProcess,
  runStagingForJob,
} from '@/app/api/integrations/[id]/sync/sync-staging';

const VALID_ACTIONS: RecoveryAction[] = ['resume', 'process_staged', 'discard_staging', 'cancel'];

async function deleteStagingForJob(
  supabase: ReturnType<typeof supabaseServer>,
  jobId: number,
  integrationType: string
): Promise<void> {
  if (integrationType === 'square') {
    await supabase.from('sync_square_data').delete().eq('job_id', jobId);
  } else {
    await supabase.from('sync_pennylane_data').delete().eq('job_id', jobId);
  }
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
      stats?: Record<string, number>;
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
        action,
        message: 'Job cancelled.',
      });
    }

    if (action === 'discard_staging') {
      await deleteStagingForJob(supabase, numericJobId, integration.integration_type);
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Staging data discarded by user',
        })
        .eq('id', numericJobId);
      await supabase
        .from('integrations')
        .update({ last_sync_status: null, last_sync_error: null })
        .eq('id', integrationId)
        .eq('last_sync_status', 'in_progress');

      return NextResponse.json({
        job_id: numericJobId,
        action,
        message: 'Staging data discarded. Imported records were not changed.',
      });
    }

    if (action === 'process_staged') {
      if (job.status !== 'staging') {
        return NextResponse.json(
          { error: 'process_staged is only available while job is in staging' },
          { status: 400 }
        );
      }
      await completeStagingAndQueueProcess(
        supabase,
        integrationId,
        numericJobId,
        (job.stats || {}),
        origin
      );
      return NextResponse.json({
        job_id: numericJobId,
        action,
        message: 'Processing started with staged data.',
      });
    }

    const phase = detectRecoveryPhase(job, integration);

    if (phase === 'review' && recovery.review_redirect) {
      return NextResponse.json({
        job_id: numericJobId,
        action,
        redirect: recovery.review_redirect,
        message: 'Continue on the review page.',
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

      after(async () => {
        const supabaseBg = supabaseServer();
        await runStagingForJob(
          supabaseBg,
          fullIntegration,
          numericJobId,
          job.sync_type,
          origin
        );
      });

      return NextResponse.json({
        job_id: numericJobId,
        action,
        message: 'Fetch resumed in background.',
      });
    }

    if (phase === 'process') {
      if (job.status === 'processing') {
        await supabase
          .from('sync_jobs')
          .update({ status: 'pending', started_at: null })
          .eq('id', numericJobId);
      }
      fireProcessSyncJob(origin, numericJobId);
      return NextResponse.json({
        job_id: numericJobId,
        action,
        message: 'Processing re-queued.',
      });
    }

    return NextResponse.json(
      { error: 'No recovery action available for this job state' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error recovering sync job:', error);
    return NextResponse.json(
      { error: 'Failed to recover job', details: error.message },
      { status: 500 }
    );
  }
}
