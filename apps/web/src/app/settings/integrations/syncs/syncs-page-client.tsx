"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  ChevronRight,
  ChevronDown,
  Settings2,
  ExternalLink,
  MoreHorizontal,
  ArrowRight,
} from 'lucide-react';
import {
  useAllSyncJobs,
  useIntegrations,
  useRecoverSyncBatch,
  useSyncJob,
  useToast,
} from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import {
  formatRecoveryActionLabel,
  isBenignStopMessage,
  canManageSyncJob,
  isRunningSyncStatus,
} from '@kit/lib/sync-job-utils';
import {
  groupJobsByLineage,
  shouldAutoExpandLineage,
  matchesRecoveryFilter,
  type LineageNode,
} from '@kit/lib/sync-job-lineage';
import { SyncJobRecoveryDialog } from './sync-job-recovery-dialog';

function formatDuration(startedAt?: string | null, completedAt?: string | null): string {
  if (!startedAt || !completedAt) return startedAt ? 'In progress' : '—';
  const a = new Date(startedAt).getTime();
  const b = new Date(completedAt).getTime();
  const sec = Math.round((b - a) / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function phaseLabel(status: string): string {
  switch (status) {
    case 'staging': return 'Phase 1: fetching';
    case 'pending': return 'Phase 2: pending';
    case 'processing': return 'Phase 2: running';
    case 'completed': return 'Phase 2: done';
    case 'failed': return 'Phase 2: done';
    case 'cancelled': return 'Cancelled';
    case 'stopped': return 'Stopped';
    case 'partially_imported': return 'Partially imported';
    default: return status;
  }
}

function statsSummary(stats?: Record<string, unknown> | null): string {
  if (!stats || typeof stats !== 'object') return '—';
  const parts: string[] = [];
  const n = (k: string) => (typeof stats[k] === 'number' ? (stats[k] as number) : 0);
  if (n('items_imported')) parts.push(`${n('items_imported')} items`);
  if (n('orders_imported')) parts.push(`${n('orders_imported')} orders`);
  if (n('payments_imported')) parts.push(`${n('payments_imported')} payments`);
  const failed = n('items_failed') + n('orders_failed') + n('payments_failed');
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.length ? parts.join(', ') : '—';
}

function batchBadge(stats?: Record<string, unknown> | null): string | null {
  if (!stats?.batch_id) return null;
  const role = stats.batch_role as string | undefined;
  const month = stats.month_label as string | undefined;
  if (role === 'catalog') return 'Batch · Catalog';
  if (month) return `Batch · ${month}`;
  return 'Batch';
}

type JobRow = {
  id: number;
  integration_name?: string;
  integration_type?: string;
  sync_type?: string;
  status: string;
  created_at?: string;
  started_at?: string | null;
  completed_at?: string | null;
  stats?: Record<string, unknown> | null;
  error_message?: string | null;
  recovery_action?: string | null;
  parent_job_id?: number | null;
  latest_successor?: {
    id: number;
    status: string;
    recovery_action?: string | null;
  } | null;
  successors?: {
    id: number;
    status: string;
    recovery_action?: string | null;
    created_at?: string;
  }[];
};

type BatchGroup = {
  batchId: string;
  jobs: JobRow[];
};

function groupJobsByBatch(jobs: JobRow[]): { batches: BatchGroup[]; standalone: JobRow[] } {
  const batchMap = new Map<string, JobRow[]>();
  const standalone: JobRow[] = [];

  for (const job of jobs) {
    const batchId = job.stats?.batch_id as string | undefined;
    if (batchId) {
      const list = batchMap.get(batchId) ?? [];
      list.push(job);
      batchMap.set(batchId, list);
    } else {
      standalone.push(job);
    }
  }

  const batches = Array.from(batchMap.entries()).map(([batchId, batchJobs]) => ({
    batchId,
    jobs: batchJobs.sort((a, b) => {
      const ai = (a.stats?.batch_index as number | undefined) ?? 0;
      const bi = (b.stats?.batch_index as number | undefined) ?? 0;
      if (a.stats?.batch_role === 'catalog') return -1;
      if (b.stats?.batch_role === 'catalog') return 1;
      return ai - bi;
    }),
  }));

  return { batches, standalone };
}

function SyncJobStatusBadge({ status }: { status: string }) {
  return (
    <>
      {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500 inline mr-1" />}
      {status === 'failed' && <XCircle className="h-4 w-4 text-destructive inline mr-1" />}
      {status === 'cancelled' && <XCircle className="h-4 w-4 text-muted-foreground inline mr-1" />}
      {status === 'stopped' && <Clock className="h-4 w-4 text-amber-500 inline mr-1" />}
      {status === 'partially_imported' && <AlertCircle className="h-4 w-4 text-amber-500 inline mr-1" />}
      {isRunningSyncStatus(status) && (
        <Loader2 className="h-4 w-4 animate-spin text-blue-500 inline mr-1" />
      )}
      <Badge
        variant={
          status === 'failed'
            ? 'destructive'
            : status === 'completed'
              ? 'default'
              : status === 'stopped' || status === 'partially_imported'
                ? 'outline'
                : 'secondary'
        }
        className={
          status === 'stopped' || status === 'partially_imported'
            ? 'border-amber-500/60 text-amber-700 dark:text-amber-400 bg-amber-500/10'
            : undefined
        }
      >
        {status}
      </Badge>
    </>
  );
}

function JobTableRow({
  job,
  router,
  variant = 'parent',
  depth = 0,
  expanded,
  onToggleExpand,
  hasChildren,
  onManage,
  highlight,
}: {
  job: JobRow;
  router: ReturnType<typeof useRouter>;
  variant?: 'parent' | 'child';
  depth?: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
  hasChildren?: boolean;
  onManage?: (jobId: number) => void;
  highlight?: boolean;
}) {
  const badge = batchBadge(job.stats);
  const isChild = variant === 'child';
  const canManage =
    isRunningSyncStatus(job.status) ||
    ['cancelled', 'stopped', 'failed', 'partially_imported'].includes(job.status);
  const latestSuccessor = job.latest_successor;

  const openJob = () => router.push(`/settings/integrations/syncs/${job.id}`);

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${isChild ? 'bg-muted/20' : ''} ${highlight ? 'ring-1 ring-inset ring-primary/40' : ''}`}
      onClick={openJob}
    >
      <TableCell style={{ paddingLeft: `${12 + depth * 24}px` }}>
        <div className="flex items-center gap-1">
          {hasChildren ? (
            <button
              type="button"
              className="p-0.5 rounded hover:bg-muted shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              aria-label={expanded ? 'Collapse recovery jobs' : 'Expand recovery jobs'}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <span className="font-medium">{job.integration_name || job.integration_type || '—'}</span>
          {job.integration_type && (
            <Badge variant="outline" className="ml-2 text-xs">{job.integration_type}</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="font-medium">#{job.id}</span>
        {!isChild && job.successors && job.successors.length > 0 && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {job.successors.length} recovery
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <span>{job.sync_type || '—'}</span>
        {badge && <Badge variant="secondary" className="ml-2 text-xs">{badge}</Badge>}
        {isChild && (
          <Badge variant="outline" className="ml-2 text-xs">Recovery subjob</Badge>
        )}
        {job.recovery_action && (
          <Badge variant="outline" className="ml-2 text-xs">
            {formatRecoveryActionLabel(job.recovery_action)}
          </Badge>
        )}
        {isChild && job.parent_job_id && (
          <span className="block text-xs text-muted-foreground mt-0.5">from #{job.parent_job_id}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">{phaseLabel(job.status)}</Badge>
      </TableCell>
      <TableCell>
        <SyncJobStatusBadge status={job.status} />
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {job.created_at ? formatDateTime(job.created_at) : '—'}
      </TableCell>
      <TableCell className="text-sm">
        {formatDuration(job.started_at, job.completed_at)}
      </TableCell>
      <TableCell className="text-sm max-w-[200px] truncate" title={statsSummary(job.stats)}>
        {statsSummary(job.stats)}
      </TableCell>
      <TableCell className="max-w-[180px]">
        {job.error_message && !isBenignStopMessage(job.status, job.error_message) ? (
          <span className="text-destructive text-sm truncate block" title={job.error_message}>
            {job.error_message.length > 40 ? job.error_message.slice(0, 40) + '…' : job.error_message}
          </span>
        ) : '—'}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Job actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openJob}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open job
            </DropdownMenuItem>
            {canManage && onManage && (
              <DropdownMenuItem onClick={() => onManage(job.id)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Manage job
              </DropdownMenuItem>
            )}
            {job.status === 'stopped' && latestSuccessor && (
              <DropdownMenuItem asChild>
                <Link href={`/settings/integrations/syncs/${latestSuccessor.id}`}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View recovery job
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function JobLineageGroup({
  node,
  router,
  onManage,
  highlightJobId,
}: {
  node: LineageNode;
  router: ReturnType<typeof useRouter>;
  onManage: (jobId: number) => void;
  highlightJobId?: number | null;
}) {
  const hasChildren = node.children.length > 0;
  const [expanded, setExpanded] = useState(() =>
    shouldAutoExpandLineage(node.children) || highlightJobId === node.job.id
  );

  useEffect(() => {
    if (shouldAutoExpandLineage(node.children)) setExpanded(true);
  }, [node.children]);

  useEffect(() => {
    if (
      highlightJobId != null &&
      (highlightJobId === node.job.id || node.children.some((c) => c.id === highlightJobId))
    ) {
      setExpanded(true);
    }
  }, [highlightJobId, node.job.id, node.children]);

  return (
    <>
      <JobTableRow
        job={node.job as JobRow}
        router={router}
        variant="parent"
        hasChildren={hasChildren}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        onManage={onManage}
        highlight={highlightJobId === node.job.id}
      />
      {hasChildren && expanded &&
        node.children.map((child) => (
          <JobTableRow
            key={child.id}
            job={child as JobRow}
            router={router}
            variant="child"
            depth={1}
            highlight={highlightJobId === child.id}
          />
        ))}
    </>
  );
}

function BatchHeader({
  batch,
  onCancelAll,
  onRetryFailed,
  isPending,
}: {
  batch: BatchGroup;
  onCancelAll: (batchId: string) => void;
  onRetryFailed: (batchId: string) => void;
  isPending: boolean;
}) {
  const hasRunning = batch.jobs.some((j) => isRunningSyncStatus(j.status));
  const hasRetryable = batch.jobs.some((j) => ['failed', 'stopped'].includes(j.status));

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={10}>
        <div className="flex flex-wrap items-center justify-between gap-2 py-1">
          <span className="text-sm font-medium">Batch · {batch.jobs.length} jobs</span>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {hasRunning && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => onCancelAll(batch.batchId)}>
                Cancel all
              </Button>
            )}
            {hasRetryable && (
              <Button size="sm" variant="outline" disabled={isPending} onClick={() => onRetryFailed(batch.batchId)}>
                Retry failed
              </Button>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function LineageTableBody({
  jobs,
  router,
  onManage,
  highlightJobId,
}: {
  jobs: JobRow[];
  router: ReturnType<typeof useRouter>;
  onManage: (jobId: number) => void;
  highlightJobId?: number | null;
}) {
  const { roots } = useMemo(() => groupJobsByLineage(jobs), [jobs]);

  return (
    <>
      {roots.map((node) => (
        <JobLineageGroup
          key={node.job.id}
          node={node}
          router={router}
          onManage={onManage}
          highlightJobId={highlightJobId}
        />
      ))}
    </>
  );
}

export function SyncsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const integrationIdParam = searchParams.get('integration_id');
  const highlightJobParam = searchParams.get('highlight_job');
  const highlightJobId = highlightJobParam ? Number(highlightJobParam) : null;
  const { toast } = useToast();
  const recoverBatch = useRecoverSyncBatch();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [integrationFilter, setIntegrationFilter] = useState<string>('all');
  const [manageJobId, setManageJobId] = useState<number | null>(null);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const { data: manageJob } = useSyncJob(manageJobId);

  useEffect(() => {
    if (integrationIdParam) setIntegrationFilter(integrationIdParam);
  }, [integrationIdParam]);

  useEffect(() => {
    if (
      manageJob?.recovery &&
      canManageSyncJob(manageJob, manageJob.recovery) &&
      manageJobId != null
    ) {
      setRecoveryOpen(true);
    }
  }, [manageJob, manageJobId]);

  const filters = {
    status: statusFilter === 'all' || statusFilter === 'recovery' ? undefined : statusFilter,
    integration_id: integrationFilter === 'all' ? undefined : integrationFilter,
    limit: 50,
  };
  const { data: jobs = [], isLoading } = useAllSyncJobs(filters);
  const { data: integrations = [] } = useIntegrations();

  const displayedJobs = useMemo(() => {
    const list = jobs as JobRow[];
    if (statusFilter === 'recovery') {
      const matching = list.filter((j) => matchesRecoveryFilter(j));
      const parentIds = new Set(
        matching
          .filter((j) => j.parent_job_id != null)
          .map((j) => j.parent_job_id as number)
      );
      const matchingIds = new Set(matching.map((j) => j.id));
      const parents = list.filter((j) => parentIds.has(j.id) && !matchingIds.has(j.id));
      return [...matching, ...parents];
    }
    return list;
  }, [jobs, statusFilter]);

  const { batches, standalone } = useMemo(
    () => groupJobsByBatch(displayedJobs),
    [displayedJobs]
  );

  const runningCount = displayedJobs.filter((j) => isRunningSyncStatus(j.status)).length;
  const failedCount = displayedJobs.filter((j) => j.status === 'failed').length;
  const completedCount = displayedJobs.filter((j) => j.status === 'completed').length;
  const stoppedCount = displayedJobs.filter((j) => j.status === 'stopped').length;

  const handleBatchAction = async (batchId: string, action: 'cancel_all' | 'retry_failed') => {
    try {
      const result = await recoverBatch.mutateAsync({ batchId, action });
      toast({ title: 'Batch updated', description: result.message });
    } catch (e: unknown) {
      toast({
        title: 'Batch action failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleManage = (jobId: number) => {
    setManageJobId(jobId);
    setRecoveryOpen(false);
  };

  const tableHeader = (
    <TableHeader>
      <TableRow>
        <TableHead>Integration</TableHead>
        <TableHead>Job #</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Phase</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Created</TableHead>
        <TableHead>Duration</TableHead>
        <TableHead>Stats</TableHead>
        <TableHead>Error</TableHead>
        <TableHead className="w-[52px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/integrations">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Integrations
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sync activity</h1>
              <p className="text-muted-foreground text-sm">
                Jobs and recovery subjobs. Expand a row to see recovery chain.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{runningCount}</div>
              <p className="text-xs text-muted-foreground">Fetching or importing</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Stopped</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stoppedCount}</div>
              <p className="text-xs text-muted-foreground">Stopped for recovery</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{failedCount}</div>
              <p className="text-xs text-muted-foreground">Jobs that ended with errors</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-xs text-muted-foreground">Successfully imported</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="stopped">Stopped</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="partially_imported">Partially imported</SelectItem>
              <SelectItem value="recovery">Recovery jobs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={integrationFilter} onValueChange={setIntegrationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Integration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All integrations</SelectItem>
              {(integrations as { id: number; name?: string; integration_type?: string }[]).map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>
                  {i.name || i.integration_type || `#${i.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <CardDescription>Parent jobs with expandable recovery subjobs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No syncs yet. Start a sync from an integration to see activity here.</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/settings/integrations">Go to Integrations</Link>
                </Button>
              </div>
            ) : (
              <Table>
                {tableHeader}
                <TableBody>
                  {batches.map((batch) => (
                    <React.Fragment key={batch.batchId}>
                      <BatchHeader
                        batch={batch}
                        isPending={recoverBatch.isPending}
                        onCancelAll={(id) => void handleBatchAction(id, 'cancel_all')}
                        onRetryFailed={(id) => void handleBatchAction(id, 'retry_failed')}
                      />
                      <LineageTableBody
                        jobs={batch.jobs}
                        router={router}
                        onManage={handleManage}
                        highlightJobId={highlightJobId}
                      />
                    </React.Fragment>
                  ))}
                  <LineageTableBody
                    jobs={standalone}
                    router={router}
                    onManage={handleManage}
                    highlightJobId={highlightJobId}
                  />
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {manageJobId != null && manageJob?.recovery && (
        <SyncJobRecoveryDialog
          open={recoveryOpen}
          onOpenChange={(open) => {
            setRecoveryOpen(open);
            if (!open) setManageJobId(null);
          }}
          jobId={manageJobId}
          recovery={manageJob.recovery}
        />
      )}
    </AppLayout>
  );
}
