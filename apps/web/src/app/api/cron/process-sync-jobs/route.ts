// Process pending sync jobs: read staging data, push to working tables.
// Secured by CRON_SECRET. Call via cron (e.g. every 1–2 min) or fire-and-forget from sync route.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { processSyncJob } from '@/app/api/integrations/[id]/sync/sync-processor';
import { processPennylaneSyncJob } from '@/app/api/integrations/[id]/sync/pennylane-processor';

const CRON_SECRET = process.env.CRON_SECRET;
/** PostgREST/Supabase cap at 1000 rows per query; use that so pagination matches reality. */
const STAGING_CHUNK_SIZE = 1000;

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

  let jobs: { id: number; integration_id: number; sync_type: string; status: string }[];
  if (specificJobId) {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('id, integration_id, sync_type, status')
      .eq('id', specificJobId)
      .in('status', ['pending', 'processing']);
    if (error) {
      console.error('[process-sync-jobs] Failed to fetch job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    jobs = data || [];
  } else {
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('id, integration_id, sync_type, status')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(5);
    if (error) {
      console.error('[process-sync-jobs] Failed to fetch jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    jobs = data || [];
  }

  for (const job of jobs) {
    if (job.status === 'pending') {
      const { error: updateErr } = await supabase
        .from('sync_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id);
      if (updateErr) continue;
    }

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

    if (integration.integration_type === 'pennylane' || integration.integration_type === 'csv_bank') {
      const { data: pennylaneRows, error: plErr } = await supabase
        .from('sync_pennylane_data')
        .select('data_type, source_id, payload')
        .eq('job_id', job.id);
      if (plErr) {
        await supabase
          .from('sync_jobs')
          .update({
            status: 'failed',
            error_message: plErr.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        continue;
      }
      const rows = (pennylaneRows ?? []) as { data_type: string; source_id: string; payload: any }[];
      try {
        const result = await processPennylaneSyncJob(supabase, job, integration, rows);
        const completedAt = new Date().toISOString();
        await supabase
          .from('sync_jobs')
          .update({
            status: 'completed',
            completed_at: completedAt,
            error_message: result.error_message ?? null,
            stats: result.stats,
          })
          .eq('id', job.id);
        await supabase
          .from('integrations')
          .update({
            last_sync_at: completedAt,
            last_sync_status: 'success',
            last_sync_error: result.error_message ?? null,
          })
          .eq('id', job.integration_id);
      } catch (e: any) {
        const completedAt = new Date().toISOString();
        await supabase
          .from('sync_jobs')
          .update({
            status: 'failed',
            completed_at: completedAt,
            error_message: e?.message || 'Pennylane processing failed',
          })
          .eq('id', job.id);
        await supabase
          .from('integrations')
          .update({
            last_sync_at: completedAt,
            last_sync_status: 'error',
            last_sync_error: e?.message || 'Pennylane processing failed',
          })
          .eq('id', job.integration_id);
      }
      continue;
    }

    const { count, error: countErr } = await supabase
      .from('sync_square_data')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', job.id)
      .is('processed_at', null);
    if (countErr) {
      await supabase
        .from('sync_jobs')
        .update({
          status: 'failed',
          error_message: countErr.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      continue;
    }
    const totalUnprocessed = count ?? 0;
    const totalChunks = Math.max(1, Math.ceil(totalUnprocessed / STAGING_CHUNK_SIZE));

    const accumulatedStats: Record<string, number> = {
      items_imported: 0,
      items_failed: 0,
      orders_imported: 0,
      orders_failed: 0,
      payments_imported: 0,
      payments_failed: 0,
    };

    try {
      let chunkIndex = 0;
      while (true) {
        const { data: chunkRows, error: chunkErr } = await supabase
          .from('sync_square_data')
          .select('id, data_type, source_id, payload')
          .eq('job_id', job.id)
          .is('processed_at', null)
          .order('id', { ascending: true })
          .limit(STAGING_CHUNK_SIZE);
        if (chunkErr) throw new Error(chunkErr.message);
        const rows = chunkRows ?? [];
        if (rows.length === 0) break;

        const chunkContext = {
          chunkIndex,
          totalChunks,
          accumulatedStats: { ...accumulatedStats },
        };
        const result = await processSyncJob(supabase, job, integration, rows, chunkContext);
        accumulatedStats.items_imported += result.stats.items_imported;
        accumulatedStats.items_failed += result.stats.items_failed;
        accumulatedStats.orders_imported += result.stats.orders_imported;
        accumulatedStats.orders_failed += result.stats.orders_failed;
        accumulatedStats.payments_imported += result.stats.payments_imported;
        accumulatedStats.payments_failed += result.stats.payments_failed;

        const ids = rows.map((r: { id: number }) => r.id);
        await supabase
          .from('sync_square_data')
          .update({ processed_at: new Date().toISOString() })
          .in('id', ids);
        chunkIndex += 1;
      }

      const hasFailures =
        accumulatedStats.items_failed > 0 ||
        accumulatedStats.orders_failed > 0 ||
        accumulatedStats.payments_failed > 0;
      const error_message = hasFailures
        ? `${accumulatedStats.items_failed} items, ${accumulatedStats.orders_failed} orders, ${accumulatedStats.payments_failed} payments failed`
        : undefined;

      const completedAt = new Date().toISOString();
      await supabase
        .from('sync_jobs')
        .update({
          status: 'completed',
          completed_at: completedAt,
          error_message: error_message ?? null,
          stats: accumulatedStats,
        })
        .eq('id', job.id);
      await supabase
        .from('integrations')
        .update({
          last_sync_at: completedAt,
          last_sync_status: 'success',
          last_sync_error: error_message ?? null,
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
