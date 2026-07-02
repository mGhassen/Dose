import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import { fetchSyncJobFamily } from '@/lib/fetch-sync-job-family';
import { resolveStagingJobId } from '@/lib/sync-job-recovery';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; stepId: string }> }
) {
  try {
    const { jobId, stepId } = await params;
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const supabase = supabaseServer();
    const access = await getSyncJobWithIntegrationForUser(supabase, jobId, token);
    if (!access.ok) {
      return NextResponse.json({ error: access.message }, { status: access.status });
    }

    const family = await fetchSyncJobFamily(
      supabase,
      Number(jobId),
      access.integration.integration_type
    );
    if (!family) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const familyJobIds = new Set(family.jobs.map((j) => j.id));

    const { data: step, error: stepErr } = await supabase
      .from('sync_job_steps')
      .select('id, job_id, sequence, name, status, details, created_at, updated_at')
      .eq('id', stepId)
      .maybeSingle();

    if (stepErr || !step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    const auditJobId = step.job_id as number;
    if (!familyJobIds.has(auditJobId)) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    const familyMember = family.jobs.find((j) => j.id === auditJobId);
    const stagingJobId = familyMember?.staging_job_id ?? resolveStagingJobId({ id: auditJobId, parent_job_id: familyMember?.parent_job_id });

    const sp = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(Number(sp.get('limit')) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.max(Number(sp.get('offset')) || 0, 0);
    const search = sp.get('search')?.trim() ?? '';
    const dataType = sp.get('data_type')?.trim() ?? '';
    const errorsOnly = sp.get('errors_only') === 'true';

    if (access.integration.integration_type !== 'square') {
      return NextResponse.json({
        step,
        staging_job_id: stagingJobId,
        entries: [],
        pagination: { total: 0, limit, offset },
        error_count: 0,
        message: 'Entry drill-down is only available for Square sync jobs',
      });
    }

    let query = supabase
      .from('sync_square_data')
      .select('id, data_type, source_id, payload, processed_at, skip_reason', { count: 'exact' })
      .eq('job_id', stagingJobId)
      .or(`step_id.eq.${stepId},process_step_id.eq.${stepId}`)
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    if (dataType) query = query.eq('data_type', dataType);
    if (search) query = query.ilike('source_id', `%${search}%`);

    const { data: rows, count, error: rowsErr } = await query;
    if (rowsErr) {
      return NextResponse.json({ error: rowsErr.message }, { status: 500 });
    }

    const { data: errors } = await supabase
      .from('sync_import_errors')
      .select('source_id, error_message')
      .eq('job_id', auditJobId);

    const errorBySource = new Map<string, string>();
    for (const e of errors ?? []) {
      errorBySource.set(e.source_id as string, e.error_message as string);
    }

    let entries = (rows ?? []).map((r) => ({
      id: r.id as number,
      data_type: r.data_type as string,
      source_id: r.source_id as string,
      payload: r.payload,
      processed_at: (r.processed_at as string) ?? null,
      skip_reason: (r.skip_reason as string) ?? null,
      error_message: errorBySource.get(r.source_id as string) ?? null,
    }));

    if (errorsOnly) {
      entries = entries.filter((e) => e.error_message != null);
    }

    const errorCount = entries.filter((e) => e.error_message != null).length;

    return NextResponse.json({
      step,
      staging_job_id: stagingJobId,
      entries,
      pagination: { total: count ?? entries.length, limit, offset },
      error_count: errorCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch step entries';
    console.error('Error fetching step entries:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
