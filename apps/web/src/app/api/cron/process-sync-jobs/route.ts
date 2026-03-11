// Process pending sync jobs: read staging data, push to working tables.
// Secured by CRON_SECRET. Call via cron (e.g. every 1–2 min) or fire-and-forget from sync route.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { processSyncJob } from '@/app/api/integrations/[id]/sync/sync-processor';

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: NextRequest): boolean {
  if (!CRON_SECRET) return true;
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7) === CRON_SECRET;
  return request.headers.get('x-cron-secret') === CRON_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runProcessor();
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const jobId = request.nextUrl.searchParams.get('job_id');
  return runProcessor(jobId ? Number(jobId) : undefined);
}

async function runProcessor(specificJobId?: number) {
  const supabase = supabaseServer();

  let jobs: { id: number; integration_id: number; sync_type: string }[];
  if (specificJobId) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('id, integration_id, sync_type')
      .eq('id', specificJobId)
      .eq('status', 'pending');
    if (error) {
      console.error('[process-sync-jobs] Failed to fetch job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    jobs = data || [];
  } else {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('id, integration_id, sync_type')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);
    if (error) {
      console.error('[process-sync-jobs] Failed to fetch jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    jobs = data || [];
  }

  for (const job of jobs) {
    const { error: updateErr } = await supabase
      .from('sync_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);
    if (updateErr) continue;

    const { data: integration, error: intErr } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', job.integration_id)
      .single();
    if (intErr || !integration) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: 'Integration not found',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      continue;
    }

    const { data: stagingRows, error: stageErr } = await supabase
      .from('sync_square_data')
      .select('data_type, source_id, payload')
      .eq('job_id', job.id);
    if (stageErr) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: stageErr.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      continue;
    }

    try {
      const result = await processSyncJob(supabase, job, integration, stagingRows || []);
      const completedAt = new Date().toISOString();
      await supabase
        .from('sync_jobs')
        .update({
          status: result.status,
          completed_at: completedAt,
          error_message: result.error_message || null,
          stats: result.stats,
        })
        .eq('id', job.id);
      await supabase
        .from('integrations')
        .update({
          last_sync_at: completedAt,
          last_sync_status: result.status === 'completed' ? 'success' : 'error',
          last_sync_error: result.error_message || null,
        })
        .eq('id', job.integration_id);
    } catch (e: any) {
      const completedAt = new Date().toISOString();
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          completed_at: completedAt,
          error_message: e?.message || 'Processing failed',
        })
        .eq('id', job.id);
      await supabase
        .from('integrations')
        .update({
          last_sync_at: completedAt,
          last_sync_status: 'error',
          last_sync_error: e?.message || 'Processing failed',
        })
        .eq('id', job.integration_id);
    }
  }

  return NextResponse.json({ processed: jobs.length });
}
