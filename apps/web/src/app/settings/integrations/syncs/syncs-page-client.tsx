"use client";

import React, { useState, useEffect } from 'react';
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
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import { useAllSyncJobs, useIntegrations } from '@kit/hooks';
import { formatDateTime } from '@kit/lib/date-format';

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
    case 'pending': return 'Phase 2: pending';
    case 'processing': return 'Phase 2: running';
    case 'completed': return 'Phase 2: done';
    case 'failed': return 'Phase 2: done';
    default: return status;
  }
}

function statsSummary(stats?: Record<string, number> | null): string {
  if (!stats || typeof stats !== 'object') return '—';
  const parts: string[] = [];
  if (stats.items_imported) parts.push(`${stats.items_imported} items`);
  if (stats.orders_imported) parts.push(`${stats.orders_imported} orders`);
  if (stats.payments_imported) parts.push(`${stats.payments_imported} payments`);
  const failed = (stats.items_failed || 0) + (stats.orders_failed || 0) + (stats.payments_failed || 0);
  if (failed > 0) parts.push(`${failed} failed`);
  return parts.length ? parts.join(', ') : '—';
}

export function SyncsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const integrationIdParam = searchParams.get('integration_id');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [integrationFilter, setIntegrationFilter] = useState<string>('all');
  useEffect(() => {
    if (integrationIdParam) setIntegrationFilter(integrationIdParam);
  }, [integrationIdParam]);

  const filters = {
    status: statusFilter === 'all' ? undefined : statusFilter,
    integration_id: integrationFilter === 'all' ? undefined : integrationFilter,
    limit: 50,
  };
  const { data: jobs = [], isLoading } = useAllSyncJobs(filters);
  const { data: integrations = [] } = useIntegrations();

  const runningCount = jobs.filter((j) => j.status === 'pending' || j.status === 'processing').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;

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
                Phase 1 = fetch + stage from source. Phase 2 = import into app.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Running</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{runningCount}</div>
              <p className="text-xs text-muted-foreground">Phase 2 pending or in progress</p>
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
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
            <CardDescription>All sync jobs for your integrations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>No syncs yet. Start a sync from an integration to see activity here.</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/settings/integrations">Go to Integrations</Link>
                </Button>
              </div>
            ) : (
              <Table>
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job: any) => (
                    <TableRow
                      key={job.id}
                      role="button"
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/settings/integrations/syncs/${job.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/settings/integrations/syncs/${job.id}`);
                        }
                      }}
                    >
                      <TableCell>
                        <span className="font-medium">{job.integration_name || job.integration_type || '—'}</span>
                        {job.integration_type && (
                          <Badge variant="outline" className="ml-2 text-xs">{job.integration_type}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{job.id}</TableCell>
                      <TableCell>{job.sync_type || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{phaseLabel(job.status)}</Badge>
                      </TableCell>
                      <TableCell>
                        {job.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500 inline mr-1" />}
                        {job.status === 'failed' && <XCircle className="h-4 w-4 text-destructive inline mr-1" />}
                        {(job.status === 'pending' || job.status === 'processing') && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500 inline mr-1" />
                        )}
                        <Badge
                          variant={
                            job.status === 'failed' ? 'destructive' :
                            job.status === 'completed' ? 'default' : 'secondary'
                          }
                        >
                          {job.status}
                        </Badge>
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
                        {job.error_message ? (
                          <span className="text-destructive text-sm truncate block" title={job.error_message}>
                            {job.error_message.length > 40 ? job.error_message.slice(0, 40) + '…' : job.error_message}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
