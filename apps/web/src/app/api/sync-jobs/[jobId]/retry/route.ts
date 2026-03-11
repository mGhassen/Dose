import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';

async function getJobAndVerifyAccess(
  supabase: any,
  jobId: string,
  accessToken: string | null
): Promise<{ job: any; error: any }> {
  if (!accessToken) {
    return { job: null, error: { status: 401, message: 'Unauthorized' } };
  }
  const { data: { user } } = await supabase.auth.getUser(accessToken);
  if (!user) {
    return { job: null, error: { status: 401, message: 'Unauthorized' } };
  }
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();
  if (!account) {
    return { job: null, error: { status: 404, message: 'Account not found' } };
  }
  const { data: job, error } = await supabase
    .from('sync_jobs')
    .select('id, integration_id, status')
    .eq('id', jobId)
    .single();
  if (error || !job) {
    return { job: null, error: { status: 404, message: 'Job not found' } };
  }
  const { data: integration } = await supabase
    .from('integrations')
    .select('id, account_id')
    .eq('id', job.integration_id)
    .single();
  if (!integration || integration.account_id !== account.id) {
    return { job: null, error: { status: 404, message: 'Job not found' } };
  }
  return { job, error: null };
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
    const { job, error: accessError } = await getJobAndVerifyAccess(supabase, jobId, token);
    if (accessError) {
      return NextResponse.json(
        { error: accessError.message },
        { status: accessError.status }
      );
    }

    if (job.status !== 'failed' && job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only failed or completed jobs can be retried' },
        { status: 400 }
      );
    }

    await supabase.from('sync_import_errors').delete().eq('job_id', jobId);
    const { error: updateErr } = await supabase
      .from('sync_jobs')
      .update({
        status: 'pending',
        started_at: null,
        completed_at: null,
        error_message: null,
      })
      .eq('id', jobId);
    if (updateErr) {
      return NextResponse.json(
        { error: updateErr.message },
        { status: 500 }
      );
    }

    const origin = request.nextUrl.origin;
    const secret = process.env.CRON_SECRET;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['x-cron-secret'] = secret;
    fetch(`${origin}/api/cron/process-sync-jobs?job_id=${jobId}`, { method: 'POST', headers }).catch(() => {});

    return NextResponse.json({ job_id: jobId, message: 'Retry started.' });
  } catch (error: any) {
    console.error('Error retrying sync job:', error);
    return NextResponse.json(
      { error: 'Failed to retry job', details: error.message },
      { status: 500 }
    );
  }
}
