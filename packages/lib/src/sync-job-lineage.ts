import { isRunningSyncStatus } from './sync-job-utils';

export type LineageJobRow = {
  id: number;
  parent_job_id?: number | null;
  recovery_action?: string | null;
  status: string;
  created_at?: string;
  successors?: LineageJobRow[];
  [key: string]: unknown;
};

export type LineageNode = {
  job: LineageJobRow;
  children: LineageJobRow[];
};

export type LineageGroupResult = {
  roots: LineageNode[];
};

export function groupJobsByLineage(jobs: LineageJobRow[]): LineageGroupResult {
  if (jobs.length === 0) return { roots: [] };

  const jobById = new Map(jobs.map((j) => [j.id, j]));
  const nestedChildIds = new Set(
    jobs.filter((j) => j.parent_job_id != null && jobById.has(j.parent_job_id)).map((j) => j.id)
  );

  const roots = jobs
    .filter((j) => !nestedChildIds.has(j.id))
    .map((job) => {
      const children = jobs
        .filter((j) => j.parent_job_id === job.id)
        .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
      return { job, children };
    });

  return { roots };
}

export function shouldAutoExpandLineage(children: LineageJobRow[]): boolean {
  return children.some((c) => isRunningSyncStatus(c.status));
}

export function matchesRecoveryFilter(job: LineageJobRow): boolean {
  if (job.recovery_action) return true;
  return Boolean(job.successors && job.successors.length > 0);
}
