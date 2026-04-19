"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
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
  RotateCcw,
  Circle,
  ChevronRight,
  ListOrdered,
  BarChart3,
  FileWarning,
  Info,
  Wrench,
} from 'lucide-react';
import { useSyncJob, useRetrySyncJob, useBackfillSaleItems } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';
import { useToast } from '@kit/hooks';
import type { SyncJobStep } from '@kit/types';

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

function stepStatusIcon(status: string) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
    case 'running':
      return <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function stepDetailsText(details?: Record<string, number | string> | null): string {
  if (!details || typeof details !== 'object') return '';
  const parts = Object.entries(details)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v !== ''))
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`);
  return parts.join(', ');
}

function isFetchStep(name: string): boolean {
  return (
    name.startsWith('Catalog —') ||
    name.startsWith('Orders —') ||
    name.startsWith('Payments —') ||
    name === 'Fetch catalog' ||
    name === 'Fetch orders' ||
    name === 'Fetch payments'
  );
}

function stepsProgress(steps: SyncJobStep[]): number {
  if (!steps.length) return 0;
  const done = steps.filter((s) => s.status === 'done').length;
  return Math.round((done / steps.length) * 100);
}

export function SyncJobDetailClient() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId != null ? Number(params.jobId) : null;
  const { data: job, isLoading, error, isError } = useSyncJob(jobId);
  const retrySyncJob = useRetrySyncJob();
  const backfillSaleItems = useBackfillSaleItems();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [backfillProgress, setBackfillProgress] = useState<{ processed: number; total: number | null } | null>(null);
  type BackfillEvent = {
    saleId: number;
    squareOrderId: string;
    status: 'missing_payload' | 'unmapped' | 'updated' | 'no_change' | 'error';
    lines_updated: number;
    movements_written: number;
    total_lines: number;
    message?: string;
  };
  const [backfillEvents, setBackfillEvents] = useState<BackfillEvent[]>([]);
  const [backfillTotals, setBackfillTotals] = useState<{
    sales_scanned: number;
    lines_updated: number;
    movements_written: number;
    missing_payload: number;
    unmapped_items: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    if (params?.jobId != null && isNaN(Number(params.jobId))) {
      router.replace('/settings/integrations/syncs');
    }
  }, [params?.jobId, router]);

  const handleBackfill = async () => {
    const integrationId = job?.integration_id;
    if (!integrationId) {
      toast({ title: 'Backfill failed', description: 'Missing integration id on job.', variant: 'destructive' });
      return;
    }
    setBackfillEvents([]);
    setBackfillTotals(null);
    try {
      let offset = 0;
      const limit = 200;
      const totals = {
        sales_scanned: 0,
        lines_updated: 0,
        movements_written: 0,
        missing_payload: 0,
        unmapped_items: 0,
        errors: 0,
      };
      setBackfillProgress({ processed: 0, total: null });
      while (true) {
        const res = await backfillSaleItems.mutateAsync({ id: String(integrationId), offset, limit });
        for (const k of Object.keys(totals) as (keyof typeof totals)[]) {
          totals[k] += res.results[k] ?? 0;
        }
        setBackfillTotals({ ...totals });
        if (res.events?.length) {
          setBackfillEvents((prev) => [...prev, ...res.events].slice(-2000));
        }
        setBackfillProgress({ processed: offset + res.processed, total: res.total });
        if (!res.has_more || res.next_offset == null) break;
        offset = res.next_offset;
      }
      toast({
        title: 'Backfill complete',
        description: `Scanned ${totals.sales_scanned} sales, patched ${totals.lines_updated} lines, wrote ${totals.movements_written} movements. Unmapped: ${totals.unmapped_items}, errors: ${totals.errors}.`,
      });
    } catch (e: any) {
      toast({ title: 'Backfill failed', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setBackfillProgress(null);
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
                Job not found or you don't have access to it.
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
  const isRunning =
    job.status === 'staging' || job.status === 'pending' || job.status === 'processing';
  const hasErrors = Boolean(job.error_message || (job.errors && job.errors.length > 0));
  const stepProgress = stepsProgress(steps);

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
      <div className="space-y-6 p-4 md:p-6 max-w-4xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
              <Link href="/settings/integrations/syncs">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sync activity
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">Job #{job.id}</h1>
              {statusBadge()}
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
          {(job.status === 'failed' || job.status === 'completed') && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBackfill}
                disabled={backfillSaleItems.isPending || backfillProgress != null}
                size="sm"
                variant="outline"
              >
                {backfillProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Backfilling {backfillProgress.processed}
                    {backfillProgress.total != null ? `/${backfillProgress.total}` : ''}…
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4 mr-2" />
                    Backfill stock
                  </>
                )}
              </Button>
              <Button onClick={handleRetry} disabled={retrySyncJob.isPending} size="sm">
                {retrySyncJob.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Retry
              </Button>
            </div>
          )}
        </div>

        {job.error_message && (
          <Alert variant="destructive" className="border-destructive/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

            {(backfillProgress || backfillEvents.length > 0 || backfillTotals) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Backfill log
                    {backfillProgress ? (
                      <Badge variant="secondary" className="gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {backfillProgress.processed}
                        {backfillProgress.total != null ? `/${backfillProgress.total}` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600/90 text-white">Done</Badge>
                    )}
                  </CardTitle>
                  {backfillTotals && (
                    <CardDescription>
                      scanned {backfillTotals.sales_scanned} · lines patched {backfillTotals.lines_updated} · movements {backfillTotals.movements_written} · unmapped {backfillTotals.unmapped_items} · missing payload {backfillTotals.missing_payload} · errors {backfillTotals.errors}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {backfillEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Waiting for first batch…</p>
                  ) : (
                    <div className="max-h-80 overflow-auto rounded-md border bg-muted/30 font-mono text-xs">
                      {backfillEvents.slice().reverse().map((e, i) => {
                        const color =
                          e.status === 'error' ? 'text-destructive' :
                          e.status === 'unmapped' || e.status === 'missing_payload' ? 'text-amber-600 dark:text-amber-400' :
                          e.status === 'updated' ? 'text-emerald-600 dark:text-emerald-400' :
                          'text-muted-foreground';
                        return (
                          <div key={`${e.saleId}-${i}`} className="flex items-start gap-3 px-3 py-1.5 border-b last:border-b-0">
                            <span className={`shrink-0 uppercase tracking-wider ${color}`}>{e.status}</span>
                            <span className="shrink-0 text-muted-foreground">sale #{e.saleId}</span>
                            <span className="shrink-0 text-muted-foreground truncate max-w-[160px]" title={e.squareOrderId}>order {e.squareOrderId.slice(0, 10)}…</span>
                            <span className="shrink-0 text-muted-foreground">lines {e.total_lines} · patched {e.lines_updated} · mov {e.movements_written}</span>
                            {e.message && (
                              <span className={`truncate ${color}`} title={e.message}>{e.message}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
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

          <TabsContent value="steps" className="mt-6 space-y-6">
            {steps.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Step progress</span>
                  <span className="font-medium">{steps.filter((s) => s.status === 'done').length} / {steps.length}</span>
                </div>
                <Progress value={stepProgress} className="h-2" />
              </div>
            )}

            {steps.length > 0 ? (
              <div className="space-y-6">
                {(() => {
                  const fetchSteps = steps.filter((s) => isFetchStep(s.name));
                  const processSteps = steps.filter((s) => !isFetchStep(s.name));
                  return (
                    <>
                      {fetchSteps.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Fetch</span>
                            {fetchSteps.length} steps
                          </h3>
                          <ul className="space-y-1.5">
                            {fetchSteps.map((step) => (
                              <li
                                key={step.sequence}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                                  step.status === 'running' ? 'border-primary/30 bg-primary/5' :
                                  step.status === 'failed' ? 'border-destructive/30 bg-destructive/5' : ''
                                }`}
                              >
                                {stepStatusIcon(step.status)}
                                <span className="font-medium flex-1 min-w-0 truncate">{step.name}</span>
                                {(step.details == null ? 0 : Object.keys(step.details).length) > 0 && (
                                  <span className="text-muted-foreground text-xs shrink-0 hidden sm:inline">
                                    {stepDetailsText(step.details)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {processSteps.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Process</span>
                            {processSteps.length} steps
                          </h3>
                          <ul className="space-y-1.5">
                            {processSteps.map((step) => (
                              <li
                                key={step.sequence}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                                  step.status === 'running' ? 'border-primary/30 bg-primary/5' :
                                  step.status === 'failed' ? 'border-destructive/30 bg-destructive/5' : ''
                                }`}
                              >
                                {stepStatusIcon(step.status)}
                                <span className="font-medium flex-1 min-w-0 truncate">{step.name}</span>
                                {(step.details == null ? 0 : Object.keys(step.details).length) > 0 && (
                                  <span className="text-muted-foreground text-xs shrink-0 hidden sm:inline">
                                    {stepDetailsText(step.details)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  {isRunning ? (
                    <>
                      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">Steps will appear as the sync runs…</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm">No steps recorded for this job.</p>
                  )}
                </CardContent>
              </Card>
            )}
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
