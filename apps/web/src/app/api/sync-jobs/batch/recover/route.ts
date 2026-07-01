import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';

const RUNNING_STATUSES = ['staging', 'pending', 'processing'];

async function cancelJob(supabase: ReturnType<typeof supabaseServer>, jobId: number, integrationType: string) {
  const updates: Record<string, unknown> = {
    status: 'cancelled',
    completed_at: new Date().toISOString(),
    error_message: 'Cancelled by user',
  };
  if (integrationType === 'csv_bulk') {
    updates.bulk_review_status = 'cancelled';
  }
  await supabase.from('sync_jobs').update(updates).eq('id', jobId);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const batchId = body.batch_id as string | undefined;
    const action = body.action as 'cancel_all' | 'retry_failed' | undefined;

    if (!batchId || !action || !['cancel_all', 'retry_failed'].includes(action)) {
      return NextResponse.json(
        { error: 'batch_id and action (cancel_all | retry_failed) are required' },
        { status: 400 }
      );
    }

    const supabase = supabaseServer();
    const { data: jobs, error } = await supabase
      .from('sync_jobs')
      .select('id, status, integration_id, stats')
      .eq('stats->>batch_id', batchId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!jobs?.length) {
      return NextResponse.json({ error: 'No jobs found for this batch' }, { status: 404 });
    }

    const integrationId = jobs[0].integration_id;
    const access = await getSyncJobWithIntegrationForUser(supabase, String(jobs[0].id), token);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const origin = request.nextUrl.origin;
    const results: { job_id: number; action: string; message: string }[] = [];

    if (action === 'cancel_all') {
      for (const job of jobs) {
        if (RUNNING_STATUSES.includes(job.status)) {
          await cancelJob(supabase, job.id, access.integration.integration_type as string);
          results.push({ job_id: job.id, action: 'cancelled', message: `Job #${job.id} cancelled.` });
        }
      }
      return NextResponse.json({
        batch_id: batchId,
        action,
        results,
        message: results.length ? `Cancelled ${results.length} job(s).` : 'No running jobs to cancel.',
      });
    }

    for (const job of jobs) {
      if (job.status === 'stopped') {
        const recoverRes = await fetch(`${origin}/api/sync-jobs/${job.id}/recover`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'resume' }),
        });
        const data = await recoverRes.json().catch(() => ({}));
        results.push({
          job_id: job.id,
          action: recoverRes.ok ? 'resume' : 'resume_failed',
          message: recoverRes.ok
            ? (data.message as string) || `Job #${job.id} recovery started.`
            : (data.error as string) || `Job #${job.id} could not be retried.`,
        });
      } else if (job.status === 'failed') {
        const retryRes = await fetch(`${origin}/api/sync-jobs/${job.id}/retry`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await retryRes.json().catch(() => ({}));
        results.push({
          job_id: job.id,
          action: retryRes.ok ? 'retry' : 'retry_failed',
          message: retryRes.ok
            ? (data.message as string) || `Job #${job.id} retry started.`
            : (data.error as string) || `Job #${job.id} could not be retried.`,
        });
      }
    }

    return NextResponse.json({
      batch_id: batchId,
      action,
      results,
      message: results.length ? `Retried ${results.length} job(s).` : 'No failed/stopped jobs to retry.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error in batch recover:', error);
    return NextResponse.json({ error: 'Failed batch recovery', details: msg }, { status: 500 });
  }
}
