"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
} from 'lucide-react';
import { useSyncJob, useRetrySyncJob } from '@kit/hooks';
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

export default function SyncJobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId != null ? Number(params.jobId) : null;
  const { data: job, isLoading, error, isError } = useSyncJob(jobId);
  const retrySyncJob = useRetrySyncJob();
  const { toast } = useToast();

  useEffect(() => {
    if (params?.jobId != null && isNaN(Number(params.jobId))) {
      router.replace('/settings/integrations/syncs');
    }
  }, [params?.jobId, router]);

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
                Job not found or you don’t have access to it.
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

  const steps: SyncJobStep[] = job.steps ?? [];
  const isRunning = job.status === 'pending' || job.status === 'processing';

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings/integrations/syncs">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sync activity
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Job #{job.id}</h1>
              <p className="text-muted-foreground text-sm">
                {job.sync_type} sync — {isRunning ? 'in progress' : job.status}
              </p>
            </div>
          </div>
          {(job.status === 'failed' || job.status === 'completed') && (
            <Button onClick={handleRetry} disabled={retrySyncJob.isPending}>
              {retrySyncJob.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Retry job
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Job metadata and duration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status</span>
                <div className="mt-1">
                  {job.status === 'completed' && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      completed
                    </Badge>
                  )}
                  {job.status === 'failed' && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      failed
                    </Badge>
                  )}
                  {(job.status === 'pending' || job.status === 'processing') && (
                    <Badge variant="secondary">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      {job.status}
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Type</span>
                <p className="font-medium mt-1">{job.sync_type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created</span>
                <p className="font-medium mt-1">{formatDateTime(job.created_at)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Started</span>
                <p className="font-medium mt-1">
                  {job.started_at ? formatDateTime(job.started_at) : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Completed</span>
                <p className="font-medium mt-1">
                  {job.completed_at ? formatDateTime(job.completed_at) : '—'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration</span>
                <p className="font-medium mt-1">
                  {formatDuration(job.started_at, job.completed_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {job.stats && Object.keys(job.stats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
              <CardDescription>Imported and failed counts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {typeof job.stats.items_imported === 'number' && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      <strong>{job.stats.items_imported}</strong> items imported
                    </span>
                  </div>
                )}
                {typeof job.stats.items_failed === 'number' && (
                  <div
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                      job.stats.items_failed > 0 ? 'border-destructive/50' : ''
                    }`}
                  >
                    {job.stats.items_failed > 0 ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      <strong>{job.stats.items_failed}</strong> items failed
                    </span>
                  </div>
                )}
                {typeof job.stats.orders_imported === 'number' && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      <strong>{job.stats.orders_imported}</strong> orders imported
                    </span>
                  </div>
                )}
                {typeof job.stats.orders_failed === 'number' && (
                  <div
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                      job.stats.orders_failed > 0 ? 'border-destructive/50' : ''
                    }`}
                  >
                    {job.stats.orders_failed > 0 ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      <strong>{job.stats.orders_failed}</strong> orders failed
                    </span>
                  </div>
                )}
                {typeof job.stats.payments_imported === 'number' && (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      <strong>{job.stats.payments_imported}</strong> payments imported
                    </span>
                  </div>
                )}
                {typeof job.stats.payments_failed === 'number' && (
                  <div
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 ${
                      job.stats.payments_failed > 0 ? 'border-destructive/50' : ''
                    }`}
                  >
                    {job.stats.payments_failed > 0 ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      <strong>{job.stats.payments_failed}</strong> payments failed
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Alert className="border-muted bg-muted/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2 text-sm">
            <p>
              <strong>Phase 1 — Fetch:</strong> Data is fetched from Square (catalog, orders, payments) and stored in staging. Steps like &quot;Catalog — page 1&quot;, &quot;Orders — 2024-01 — page 1&quot; show fetch progress.
            </p>
            <p>
              <strong>Phase 2 — Process:</strong> Staging data is processed in chunks and written to your app (items, sales, payments). Steps like &quot;Process catalog — chunk 1/5&quot;, &quot;Process catalog — complete&quot; show chunk progress and final totals.
            </p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Steps</CardTitle>
            <CardDescription>Full log: fetch and process steps (max 30 lines, scroll for more)</CardDescription>
          </CardHeader>
          <CardContent>
            {steps.length > 0 ? (
              <div className="space-y-4 max-h-[75rem] overflow-y-auto pr-1">
                {(() => {
                  const fetchSteps = steps.filter((s) => isFetchStep(s.name));
                  const processSteps = steps.filter((s) => !isFetchStep(s.name));
                  return (
                    <>
                      {fetchSteps.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Fetch
                          </h4>
                          <ul className="space-y-2">
                            {fetchSteps.map((step) => (
                              <li
                                key={step.sequence}
                                className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                              >
                                {stepStatusIcon(step.status)}
                                <span className="font-medium flex-1">{step.name}</span>
                                {(step.details == null ? 0 : Object.keys(step.details).length) > 0 && (
                                  <span className="text-muted-foreground text-xs">
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
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Process
                          </h4>
                          <ul className="space-y-2">
                            {processSteps.map((step) => (
                              <li
                                key={step.sequence}
                                className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                              >
                                {stepStatusIcon(step.status)}
                                <span className="font-medium flex-1">{step.name}</span>
                                {(step.details == null ? 0 : Object.keys(step.details).length) > 0 && (
                                  <span className="text-muted-foreground text-xs">
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
              <p className="text-muted-foreground text-sm py-2">
                {isRunning ? 'Steps will appear as the sync runs…' : 'No steps recorded for this job.'}
              </p>
            )}
          </CardContent>
        </Card>

        {job.error_message && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        {job.errors && job.errors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Per-entity errors</CardTitle>
              <CardDescription>Import failures by source id</CardDescription>
            </CardHeader>
            <CardContent>
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
                      <TableCell className="font-mono text-xs truncate max-w-[120px]">
                        {err.source_id}
                      </TableCell>
                      <TableCell className="text-destructive text-sm">{err.error_message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
