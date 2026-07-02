"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@kit/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Alert, AlertDescription } from '@kit/ui/alert';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronRight,
  ListOrdered,
  BarChart3,
  FileWarning,
  Info,
  Wrench,
} from 'lucide-react';
import { useSyncJob, useRetrySyncJob, useBackfillSyncJobStock } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import { formatRecoveryActionLabel, isBenignStopMessage } from '@kit/lib/sync-job-utils';
import { useToast } from '@kit/hooks';
import type { SyncJobStep } from '@kit/types';
import { SyncStepsExplorer } from './sync-steps-explorer';
import { SyncJobActionsMenu } from './sync-job-actions-menu';

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

function fetchCoverageSummary(stats?: Record<string, unknown> | null): string | null {
  const plan = stats?.fetch_plan as { months?: string[]; end_at?: string } | undefined;
  const coverage = stats?.fetch_coverage as Record<string, { orders?: string; payments?: string }> | undefined;
  if (!plan?.months?.length) return null;
  const complete = plan.months.filter((m) => {
    const row = coverage?.[m];
    return row?.orders === 'complete' && row?.payments === 'complete';
  }).length;
  const missing = plan.months.filter((m) => {
    const row = coverage?.[m];
    return row?.orders !== 'complete' || row?.payments !== 'complete';
  });
  const base = `Fetch coverage: ${complete}/${plan.months.length} months`;
  if (missing.length > 0) return `${base} — missing ${missing.join(', ')}`;
  if (stats?.fetch_complete) return `${base} — complete`;
  return base;
}

export function SyncJobDetailClient() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId != null ? Number(params.jobId) : null;
  const { data: job, isLoading, error, isError } = useSyncJob(jobId);
  const retrySyncJob = useRetrySyncJob();
  const backfillSyncJobStock = useBackfillSyncJobStock();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [backfillResult, setBackfillResult] = useState<{
    affected_sales: number;
    sales_backfilled: number;
    stock_rewritten: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    if (params?.jobId != null && isNaN(Number(params.jobId))) {
      router.replace('/settings/integrations/syncs');
    }
  }, [params?.jobId, router]);

  const handleBackfill = async () => {
    if (jobId == null) return;
    try {
      const res = await backfillSyncJobStock.mutateAsync(jobId);
      setBackfillResult({
        affected_sales: res.affected_sales,
        sales_backfilled: res.sales_backfilled,
        stock_rewritten: res.stock_rewritten,
        errors: res.errors,
      });
      toast({
        title: 'Backfill complete',
        description: res.message,
      });
    } catch (e: unknown) {
      toast({
        title: 'Backfill failed',
        description: e instanceof Error ? e.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  const handleRetry = async () => {
    if (jobId == null) return;
    try {
      await retrySyncJob.mutateAsync(jobId);
      toast({ title: 'Retry started', description: 'Job has been queued for processing.' });
    } catch (e: any) {
      toast({ title: 'Retry failed', description: e?.message || 'Failed to retry', variant: 'destructive' });
    }
  };

  if (jobId == null || (params?.jobId != null && isNaN(Number(params.jobId)))) {
    return (
      <AppLayout>
        <div className="space-y-4 p-4 md:p-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/integrations/syncs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sync activity
            </Link>
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Invalid job ID</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoading && !job) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (isError || (!isLoading && !job)) {
    const errorDetail = error instanceof Error ? error.message : null;
    return (
      <AppLayout>
        <div className="space-y-4 p-4 md:p-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings/integrations/syncs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sync activity
            </Link>
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {errorDetail || "Job not found or you don't have access to it."}
              </p>
              <Button variant="link" asChild className="mt-2 w-full justify-center">
                <Link href="/settings/integrations/syncs">View all syncs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const steps: SyncJobStep[] = job.steps ?? [];
  const recovery = job.recovery;
  const isRunning =
    job.status === 'staging' || job.status === 'pending' || job.status === 'processing';
  const recoveryLabel = formatRecoveryActionLabel(job.recovery_action);
  const isDiscardSuccessor = job.recovery_action === 'discard_staging';
  const isDiscardComplete = isDiscardSuccessor && job.status === 'completed';
  const showRetry =
    job.status === 'failed' || (job.status === 'completed' && !isDiscardSuccessor);
  const stockReconcileFailed = (job.stats?.stock_reconcile_failed as number | undefined) ?? 0;
  const showBackfill = stockReconcileFailed > 0 && !isRunning;
  const primarySuccessor = job.successors?.[0];
  const syncActivityHref = job.integration_id
    ? `/settings/integrations/syncs?integration_id=${job.integration_id}`
    : '/settings/integrations/syncs';
  const hasErrors =
    Boolean(job.error_message && !isBenignStopMessage(job.status, job.error_message)) ||
    Boolean(job.errors && job.errors.length > 0);

  const statusBadge = () => {
    if (job.status === 'completed') {
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600/90 text-white gap-1.5">
          <CheckCircle2 className="h-3.5 w-3" />
          Completed
        </Badge>
      );
    }
    if (job.status === 'failed') {
      return (
        <Badge variant="destructive" className="gap-1.5">
          <XCircle className="h-3.5 w-3" />
          Failed
        </Badge>
      );
    }
    if (job.status === 'cancelled') {
      return (
        <Badge variant="secondary" className="gap-1.5">
          <XCircle className="h-3.5 w-3" />
          Cancelled
        </Badge>
      );
    }
    if (job.status === 'stopped') {
      return (
        <Badge variant="outline" className="gap-1.5 border-amber-500/60 text-amber-700 dark:text-amber-400 bg-amber-500/10">
          <Clock className="h-3.5 w-3" />
          Stopped
        </Badge>
      );
    }
    if (job.status === 'partially_imported') {
      return (
        <Badge variant="outline" className="gap-1.5 border-amber-500/60 text-amber-700 dark:text-amber-400 bg-amber-500/10">
          <AlertCircle className="h-3.5 w-3" />
          Partially imported
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1.5">
        <Loader2 className="h-3.5 w-3 animate-spin" />
        {job.status === 'staging'
          ? 'Fetching from source'
          : job.status === 'processing'
            ? 'Running'
            : 'Pending'}
      </Badge>
    );
  };

  return (
    <AppLayout>
      <div
        className={
          activeTab === 'steps'
            ? 'flex flex-col flex-1 min-h-0 p-4 md:p-6 max-w-none h-full'
            : 'space-y-6 p-4 md:p-6 max-w-4xl'
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
              <Link href={syncActivityHref}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sync activity
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">Job #{job.id}</h1>
              {statusBadge()}
              {recoveryLabel && (
                <Badge variant="outline" className="text-xs">
                  {recoveryLabel}
                </Badge>
              )}
              <span className="text-muted-foreground text-sm">{job.sync_type}</span>
              {(job.bulk_review_status === 'needs_review' || job.bulk_review_status === 'ready') &&
                job.status !== 'completed' &&
                job.status !== 'processing' && (
                  <Button size="sm" asChild>
                    <Link href={`/settings/integrations/syncs/${job.id}/review`}>Review import</Link>
                  </Button>
                )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SyncJobActionsMenu
              jobId={job.id}
              recovery={recovery}
              showRetry={showRetry}
              showBackfill={showBackfill}
              onRetry={handleRetry}
              onBackfill={handleBackfill}
              retryPending={retrySyncJob.isPending}
              backfillPending={backfillSyncJobStock.isPending}
            />
          </div>
        </div>

        {showBackfill && (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              {stockReconcileFailed.toLocaleString()} sale
              {stockReconcileFailed === 1 ? '' : 's'} missing stock movements (catalog was not mapped at import time).
              Use <strong>Backfill stock</strong> in the job menu, or retry/resume the job to run the backfill step automatically.
            </AlertDescription>
          </Alert>
        )}

        {job.status === 'stopped' && (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              This job was stopped for recovery.
              {primarySuccessor ? (
                <>
                  {' '}
                  See successor{' '}
                  <Link
                    href={`/settings/integrations/syncs/${primarySuccessor.id}`}
                    className="font-medium underline"
                  >
                    job #{primarySuccessor.id}
                  </Link>
                  {formatRecoveryActionLabel(primarySuccessor.recovery_action)
                    ? ` (${formatRecoveryActionLabel(primarySuccessor.recovery_action)})`
                    : ''}
                  .
                </>
              ) : (
                ' Check sync activity for a recovery job.'
              )}
            </AlertDescription>
          </Alert>
        )}

        {isDiscardComplete && (
          <Alert className="border-emerald-500/50 bg-emerald-500/5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription>
              Staging data removed from job #
              {(job.stats?.staging_discarded_from_job as number | undefined) ?? job.parent_job_id}.
              Imported app data was not changed.
            </AlertDescription>
          </Alert>
        )}

        {job.status === 'cancelled' && recovery && recovery.staging.staged_rows > 0 && (
          <Alert className="border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Staging kept ({recovery.staging.staged_rows.toLocaleString()} rows). Use the{' '}
              <strong>actions menu</strong> to resume or discard unprocessed staging (creates a recovery
              subjob).
              {primarySuccessor ? (
                <>
                  {' '}
                  See recovery subjob{' '}
                  <Link
                    href={`/settings/integrations/syncs/${primarySuccessor.id}`}
                    className="font-medium underline"
                  >
                    #{primarySuccessor.id}
                  </Link>
                  {formatRecoveryActionLabel(primarySuccessor.recovery_action)
                    ? ` (${formatRecoveryActionLabel(primarySuccessor.recovery_action)})`
                    : ''}
                  .
                </>
              ) : null}
            </AlertDescription>
          </Alert>
        )}

        {job.status === 'partially_imported' && (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              Import was started then aborted.{' '}
              {recovery?.staging.processed_rows
                ? `${recovery.staging.processed_rows.toLocaleString()} records were imported and their staging rows are kept.`
                : 'Some records were imported.'}{' '}
              App data was not rolled back.
            </AlertDescription>
          </Alert>
        )}

        {fetchCoverageSummary(job.stats) && (
          <Alert className={job.stats?.fetch_complete ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 bg-amber-500/5'}>
            <Info className="h-4 w-4" />
            <AlertDescription>{fetchCoverageSummary(job.stats)}</AlertDescription>
          </Alert>
        )}

        {recovery?.is_stuck && isRunning && (
          <Alert className="border-amber-500/50 bg-amber-500/5">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              This job appears stuck. Use the <strong>actions menu</strong> to resume, process staged data, or cancel.
            </AlertDescription>
          </Alert>
        )}

        {job.error_message && !isBenignStopMessage(job.status, job.error_message) && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        {(job.parent_job_id || (job.successors && job.successors.length > 0)) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recovery chain</CardTitle>
              <CardDescription>Parent job and recovery subjobs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.parent_job_id && (
                <p className="text-sm">
                  Parent:{' '}
                  <Link
                    href={`/settings/integrations/syncs/${job.parent_job_id}`}
                    className="font-medium underline"
                  >
                    Job #{job.parent_job_id}
                  </Link>
                </p>
              )}
              {job.successors && job.successors.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {job.successors.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <Link
                            href={`/settings/integrations/syncs/${s.id}`}
                            className="font-medium underline"
                          >
                            #{s.id}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {formatRecoveryActionLabel(s.recovery_action) ?? '—'}
                        </TableCell>
                        <TableCell>{s.status}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.created_at ? formatDateTime(s.created_at) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Button variant="link" className="h-auto p-0" asChild>
                <Link href={`/settings/integrations/syncs?integration_id=${job.integration_id}&highlight_job=${job.id}`}>
                  View in sync activity
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className={`w-full ${activeTab === 'steps' ? 'flex flex-col flex-1 min-h-0' : ''}`}>
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid lg:grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="steps" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Steps
              {steps.length > 0 && (
                <span className="text-muted-foreground font-normal">({steps.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="errors" className="gap-2" disabled={!hasErrors}>
              <FileWarning className="h-4 w-4" />
              Errors
              {job.errors?.length ? (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {job.errors.length}
                </Badge>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status & timing</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</p>
                  <p className="mt-1 font-medium">{job.status}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</p>
                  <p className="mt-1 font-medium">{job.sync_type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
                  <p className="mt-1 font-medium">{formatDuration(job.started_at, job.completed_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</p>
                  <p className="mt-1 text-sm">{formatDateTime(job.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Started</p>
                  <p className="mt-1 text-sm">{job.started_at ? formatDateTime(job.started_at) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Completed</p>
                  <p className="mt-1 text-sm">{job.completed_at ? formatDateTime(job.completed_at) : '—'}</p>
                </div>
              </CardContent>
            </Card>

            {job.stats && Object.keys(job.stats).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Import stats</CardTitle>
                  <CardDescription>Counts from this sync run</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { type: 'Items', imported: job.stats.items_imported, failed: job.stats.items_failed },
                      { type: 'Orders', imported: job.stats.orders_imported, failed: job.stats.orders_failed },
                      { type: 'Payments', imported: job.stats.payments_imported, failed: job.stats.payments_failed },
                      {
                        type: 'Stock movements',
                        imported: job.stats.stock_reconciled,
                        failed: job.stats.stock_reconcile_failed,
                        importedLabel: 'Reconciled',
                        failedLabel: 'Failed',
                      },
                    ].map((row: { type: string; imported?: number; failed?: number; importedLabel?: string; failedLabel?: string }) => {
                      const hasData = typeof row.imported === 'number' || typeof row.failed === 'number';
                      if (!hasData) return null;
                      return (
                        <div key={row.type} className="flex flex-col rounded-lg border bg-card overflow-hidden">
                          <div className="px-4 py-2 border-b bg-muted/50">
                            <p className="text-sm font-medium">{row.type}</p>
                          </div>
                          <div className="divide-y">
                            {typeof row.imported === 'number' && (
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div className="rounded-full bg-emerald-500/10 p-2 shrink-0">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                  <p className="text-xl font-semibold">{row.imported}</p>
                                  <p className="text-xs text-muted-foreground">{row.importedLabel ?? 'Imported'}</p>
                                </div>
                              </div>
                            )}
                            {typeof row.failed === 'number' && (
                              <div
                                className={`flex items-center gap-3 px-4 py-3 ${
                                  row.failed > 0 ? 'bg-destructive/5' : ''
                                }`}
                              >
                                <div
                                  className={`rounded-full p-2 shrink-0 ${
                                    row.failed > 0 ? 'bg-destructive/10' : 'bg-muted'
                                  }`}
                                >
                                  {row.failed > 0 ? (
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-xl font-semibold">{row.failed}</p>
                                  <p className="text-xs text-muted-foreground">{row.failedLabel ?? 'Failed'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {backfillResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Backfill result
                    <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600/90 text-white">
                      Done
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    affected {backfillResult.affected_sales} · sales patched {backfillResult.sales_backfilled} ·
                    movements {backfillResult.stock_rewritten} · errors {backfillResult.errors}
                  </CardDescription>
                </CardHeader>
              </Card>
            )}

            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="group gap-2 text-muted-foreground">
                  <Info className="h-4 w-4" />
                  How sync phases work
                  <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Alert className="mt-2 border-muted bg-muted/30">
                  <AlertDescription className="space-y-2 text-sm">
                    <p>
                      <strong>Phase 1 — Fetch:</strong> Data is fetched from the source (catalog, orders, payments) and stored in staging. Steps like &quot;Catalog — page 1&quot; show fetch progress.
                    </p>
                    <p>
                      <strong>Phase 2 — Process:</strong> Staging data is processed in chunks and written to your app. Steps like &quot;Process catalog — chunk 1/5&quot; show chunk progress and totals.
                    </p>
                  </AlertDescription>
                </Alert>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="steps" className="mt-4 flex flex-col flex-1 min-h-0 data-[state=inactive]:hidden">
            <SyncStepsExplorer anchorJobId={job.id} />
          </TabsContent>

          <TabsContent value="errors" className="mt-6">
            {job.error_message && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{job.error_message}</AlertDescription>
              </Alert>
            )}
            {job.errors && job.errors.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Per-entity errors</CardTitle>
                  <CardDescription>Import failures by source id</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Source ID</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {job.errors.map((err: { data_type: string; source_id: string; error_message: string }, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{err.data_type}</TableCell>
                            <TableCell className="font-mono text-xs truncate max-w-[140px]" title={err.source_id}>
                              {err.source_id}
                            </TableCell>
                            <TableCell className="text-destructive text-sm max-w-[280px]">{err.error_message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ) : !job.error_message && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  No per-entity errors for this job.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
