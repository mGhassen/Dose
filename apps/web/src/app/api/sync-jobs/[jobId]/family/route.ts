import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import { fetchSyncJobFamily } from '@/lib/fetch-sync-job-family';

export async function GET(
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

    const family = await fetchSyncJobFamily(
      supabase,
      Number(jobId),
      access.integration.integration_type
    );
    if (!family) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(family);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job family';
    console.error('Error fetching sync job family:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
