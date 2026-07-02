import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@kit/lib/supabase';
import { getSyncJobWithIntegrationForUser } from '@/lib/sync-job-access';
import { fetchSyncJobFamily, fetchSyncFamilySteps } from '@/lib/fetch-sync-job-family';

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

    const sp = request.nextUrl.searchParams;
    const jobIdsParam = sp.get('job_ids');
    const jobIds = jobIdsParam
      ? jobIdsParam
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => !Number.isNaN(n))
      : family.jobs.map((j) => j.id);

    const validIds = new Set(family.jobs.map((j) => j.id));
    const filteredIds = jobIds.filter((id) => validIds.has(id));
    const familyJobs = family.jobs.filter((j) => filteredIds.includes(j.id));

    const steps = await fetchSyncFamilySteps(
      supabase,
      filteredIds,
      access.integration.integration_type,
      familyJobs
    );

    return NextResponse.json({ steps });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch steps';
    console.error('Error fetching sync family steps:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
