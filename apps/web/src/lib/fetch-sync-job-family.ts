import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchStagingCounts,
  getJobChainRootId,
  resolveStagingJobId,
} from '@/lib/sync-job-recovery';

type JobRow = {
  id: number;
  integration_id: number;
  parent_job_id?: number | null;
  status: string;
  sync_type: string;
  recovery_action?: string | null;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  stats?: Record<string, unknown> | null;
};

export type SyncJobFamilyMember = {
  id: number;
  parent_job_id: number | null;
  status: string;
  sync_type: string;
  recovery_action: string | null;
  batch_role: string | null;
  month_label: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  stats: Record<string, unknown>;
  staging: { staged_rows: number; processed_rows: number; unprocessed_rows: number };
  staging_job_id: number;
  step_count: number;
  entry_count: number;
  error_count: number;
  last_step: { name: string; status: string; updated_at: string } | null;
};

export type SyncJobFamily = {
  anchor_job_id: number;
  root_job_id: number;
  staging_job_id: number;
  batch_id: string | null;
  jobs: SyncJobFamilyMember[];
  lineage: Array<{ parent_id: number; child_id: number }>;
};

function jobLabel(job: JobRow): { batch_role: string | null; month_label: string | null } {
  const stats = job.stats ?? {};
  return {
    batch_role: (stats.batch_role as string) ?? null,
    month_label: (stats.month_label as string) ?? null,
  };
}

async function collectRecoveryDescendants(
  supabase: SupabaseClient,
  parentIds: number[]
): Promise<{ jobs: JobRow[]; lineage: Array<{ parent_id: number; child_id: number }> }> {
  const jobs: JobRow[] = [];
  const lineage: Array<{ parent_id: number; child_id: number }> = [];
  let frontier = [...parentIds];
  const seen = new Set<number>(parentIds);

  for (let depth = 0; depth < 10 && frontier.length > 0; depth++) {
    const { data } = await supabase
      .from('sync_jobs')
      .select(
        'id, integration_id, parent_job_id, status, sync_type, recovery_action, created_at, started_at, completed_at, stats'
      )
      .in('parent_job_id', frontier)
      .order('created_at', { ascending: true });
    const rows = (data ?? []) as JobRow[];
    frontier = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      jobs.push(row);
      if (row.parent_job_id != null) {
        lineage.push({ parent_id: row.parent_job_id, child_id: row.id });
      }
      frontier.push(row.id);
    }
  }
  return { jobs, lineage };
}

export async function fetchSyncJobFamily(
  supabase: SupabaseClient,
  anchorJobId: number,
  integrationType: string
): Promise<SyncJobFamily | null> {
  const { data: anchor } = await supabase
    .from('sync_jobs')
    .select(
      'id, integration_id, parent_job_id, status, sync_type, recovery_action, created_at, started_at, completed_at, stats'
    )
    .eq('id', anchorJobId)
    .maybeSingle();
  if (!anchor) return null;

  const anchorRow = anchor as JobRow;
  const rootJobId = await getJobChainRootId(supabase, anchorJobId);

  const { data: rootJob } = await supabase
    .from('sync_jobs')
    .select(
      'id, integration_id, parent_job_id, status, sync_type, recovery_action, created_at, started_at, completed_at, stats'
    )
    .eq('id', rootJobId)
    .maybeSingle();
  if (!rootJob) return null;

  const rootRow = rootJob as JobRow;
  const jobMap = new Map<number, JobRow>();
  jobMap.set(rootRow.id, rootRow);
  if (anchorRow.id !== rootRow.id) jobMap.set(anchorRow.id, anchorRow);

  const batchId = (rootRow.stats?.batch_id as string) ?? null;
  if (batchId) {
    const { data: batchJobs } = await supabase
      .from('sync_jobs')
      .select(
        'id, integration_id, parent_job_id, status, sync_type, recovery_action, created_at, started_at, completed_at, stats'
      )
      .eq('integration_id', rootRow.integration_id)
      .filter('stats->>batch_id', 'eq', batchId)
      .order('created_at', { ascending: true });
    for (const j of (batchJobs ?? []) as JobRow[]) {
      jobMap.set(j.id, j);
    }
  } else if (!jobMap.has(anchorRow.id)) {
    jobMap.set(anchorRow.id, anchorRow);
  }

  const baseIds = [...jobMap.keys()];
  const { jobs: descendants, lineage } = await collectRecoveryDescendants(supabase, baseIds);
  for (const j of descendants) jobMap.set(j.id, j);

  const allJobs = [...jobMap.values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at)
  );
  const allJobIds = allJobs.map((j) => j.id);

  const [stepsRes, errorsRes, ...stagingResults] = await Promise.all([
    supabase
      .from('sync_job_steps')
      .select('id, job_id, name, status, updated_at, created_at')
      .in('job_id', allJobIds)
      .order('sequence', { ascending: true }),
    supabase.from('sync_import_errors').select('job_id, source_id').in('job_id', allJobIds),
    ...allJobs.map(async (j) => {
      const stagingJobId = resolveStagingJobId(j);
      const staging = await fetchStagingCounts(supabase, stagingJobId, integrationType);
      return { jobId: j.id, stagingJobId, staging };
    }),
  ]);

  const steps = stepsRes.data ?? [];
  const stepCountByJob = new Map<number, number>();
  const lastStepByJob = new Map<number, { name: string; status: string; updated_at: string }>();
  for (const s of steps) {
    const jid = s.job_id as number;
    stepCountByJob.set(jid, (stepCountByJob.get(jid) ?? 0) + 1);
    const updated = (s.updated_at ?? s.created_at ?? '') as string;
    const prev = lastStepByJob.get(jid);
    if (!prev || updated > prev.updated_at) {
      lastStepByJob.set(jid, {
        name: s.name as string,
        status: s.status as string,
        updated_at: updated,
      });
    }
  }

  const errorCountByJob = new Map<number, number>();
  for (const e of errorsRes.data ?? []) {
    const jid = e.job_id as number;
    errorCountByJob.set(jid, (errorCountByJob.get(jid) ?? 0) + 1);
  }

  const stagingByJobId = new Map(
    stagingResults.map((r) => [r.jobId, { stagingJobId: r.stagingJobId, staging: r.staging }])
  );

  const uniqueStagingIds = [...new Set(stagingResults.map((r) => r.stagingJobId))];
  const entryCountByStagingJob = new Map<number, number>();
  if (integrationType === 'square' && uniqueStagingIds.length > 0) {
    for (const sid of uniqueStagingIds) {
      const { count } = await supabase
        .from('sync_square_data')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', sid);
      entryCountByStagingJob.set(sid, count ?? 0);
    }
  }

  const members: SyncJobFamilyMember[] = allJobs.map((j) => {
    const { batch_role, month_label } = jobLabel(j);
    const stagingInfo = stagingByJobId.get(j.id)!;
    return {
      id: j.id,
      parent_job_id: j.parent_job_id ?? null,
      status: j.status,
      sync_type: j.sync_type,
      recovery_action: j.recovery_action ?? null,
      batch_role,
      month_label,
      created_at: j.created_at,
      started_at: j.started_at ?? null,
      completed_at: j.completed_at ?? null,
      stats: (j.stats ?? {}) as Record<string, unknown>,
      staging: stagingInfo.staging,
      staging_job_id: stagingInfo.stagingJobId,
      step_count: stepCountByJob.get(j.id) ?? 0,
      entry_count: entryCountByStagingJob.get(stagingInfo.stagingJobId) ?? 0,
      error_count: errorCountByJob.get(j.id) ?? 0,
      last_step: lastStepByJob.get(j.id) ?? null,
    };
  });

  return {
    anchor_job_id: anchorJobId,
    root_job_id: rootJobId,
    staging_job_id: resolveStagingJobId(anchorRow),
    batch_id: batchId,
    jobs: members,
    lineage,
  };
}

export type SyncFamilyStep = {
  id: number;
  job_id: number;
  sequence: number;
  name: string;
  status: string;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  entry_count: number;
  error_count: number;
  staging_job_id: number;
};

export async function fetchSyncFamilySteps(
  supabase: SupabaseClient,
  jobIds: number[],
  integrationType: string,
  familyJobs: SyncJobFamilyMember[]
): Promise<SyncFamilyStep[]> {
  if (jobIds.length === 0) return [];

  const { data: steps } = await supabase
    .from('sync_job_steps')
    .select('id, job_id, sequence, name, status, details, created_at, updated_at')
    .in('job_id', jobIds)
    .order('updated_at', { ascending: true });

  if (!steps?.length) return [];

  const stagingByAuditJob = new Map(familyJobs.map((j) => [j.id, j.staging_job_id]));
  const stepIds = steps.map((s) => s.id as number);
  const uniqueStagingIds = [...new Set(familyJobs.map((j) => j.staging_job_id))];

  const entryCountByStep = new Map<number, number>();
  if (integrationType === 'square') {
    for (const stagingId of uniqueStagingIds) {
      const relevantStepIds = steps
        .filter((s) => stagingByAuditJob.get(s.job_id as number) === stagingId)
        .map((s) => s.id as number);
      if (relevantStepIds.length === 0) continue;

      const { data: fetchRows } = await supabase
        .from('sync_square_data')
        .select('step_id')
        .eq('job_id', stagingId)
        .in('step_id', relevantStepIds);
      for (const r of fetchRows ?? []) {
        const sid = r.step_id as number;
        entryCountByStep.set(sid, (entryCountByStep.get(sid) ?? 0) + 1);
      }

      const { data: processRows } = await supabase
        .from('sync_square_data')
        .select('process_step_id')
        .eq('job_id', stagingId)
        .in('process_step_id', relevantStepIds);
      for (const r of processRows ?? []) {
        const sid = r.process_step_id as number;
        entryCountByStep.set(sid, (entryCountByStep.get(sid) ?? 0) + 1);
      }
    }
  }

  const { data: errors } = await supabase
    .from('sync_import_errors')
    .select('job_id, source_id')
    .in('job_id', jobIds);

  const errorSourceByJob = new Map<number, Set<string>>();
  for (const e of errors ?? []) {
    const jid = e.job_id as number;
    if (!errorSourceByJob.has(jid)) errorSourceByJob.set(jid, new Set());
    errorSourceByJob.get(jid)!.add(e.source_id as string);
  }

  const stagingSourceIdsByStep = new Map<number, Set<string>>();
  if (integrationType === 'square') {
    for (const stagingId of uniqueStagingIds) {
      const relevantSteps = steps.filter(
        (s) => stagingByAuditJob.get(s.job_id as number) === stagingId
      );
      const relevantIds = relevantSteps.map((s) => s.id as number);
      if (relevantIds.length === 0) continue;

      const { data: rows } = await supabase
        .from('sync_square_data')
        .select('step_id, process_step_id, source_id')
        .eq('job_id', stagingId)
        .or(
          `step_id.in.(${relevantIds.join(',')}),process_step_id.in.(${relevantIds.join(',')})`
        );
      for (const r of rows ?? []) {
        const sid = (r.step_id ?? r.process_step_id) as number;
        if (!relevantIds.includes(sid)) continue;
        if (!stagingSourceIdsByStep.has(sid)) stagingSourceIdsByStep.set(sid, new Set());
        stagingSourceIdsByStep.get(sid)!.add(r.source_id as string);
      }
    }
  }

  return steps.map((s) => {
    const jobId = s.job_id as number;
    const stepId = s.id as number;
    const stagingJobId = stagingByAuditJob.get(jobId) ?? jobId;
    const errorSources = errorSourceByJob.get(jobId) ?? new Set<string>();
    const stepSources = stagingSourceIdsByStep.get(stepId) ?? new Set<string>();
    let errorCount = 0;
    for (const src of stepSources) {
      if (errorSources.has(src)) errorCount += 1;
    }

    return {
      id: stepId,
      job_id: jobId,
      sequence: s.sequence as number,
      name: s.name as string,
      status: s.status as string,
      details: (s.details ?? {}) as Record<string, unknown>,
      created_at: (s.created_at ?? '') as string,
      updated_at: (s.updated_at ?? s.created_at ?? '') as string,
      entry_count: entryCountByStep.get(stepId) ?? 0,
      error_count: errorCount,
      staging_job_id: stagingJobId,
    };
  });
}
