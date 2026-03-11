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
    .select('*')
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

export async function GET(
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

    const { data: errors } = await supabase
      .from('sync_import_errors')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    return NextResponse.json({ ...job, errors: errors || [] });
  } catch (error: any) {
    console.error('Error fetching sync job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job', details: error.message },
      { status: 500 }
    );
  }
}
