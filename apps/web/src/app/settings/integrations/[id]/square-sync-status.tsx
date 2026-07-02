"use client";

import Link from 'next/link';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';
import {
  formatRecoveryActionLabel,
  isBenignStopMessage,
  isRunningSyncStatus,
} from '@kit/lib/sync-job-utils';
import type { Integration, SyncJob } from '@kit/types';

function phaseLabel(status: string): string {
  switch (status) {
    case 'staging':
      return 'Fetching from Square';
    case 'pending':
      return 'Waiting to import';
    case 'processing':
      return 'Importing into app';
    default:
      return status;
  }
}

function lastSyncStatusBadge(status: Integration['last_sync_status']) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        Success
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <XCircle className="h-4 w-4 text-destructive" />
        Error
      </span>
    );
  }
  if (status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        In progress
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">Not synced yet</span>;
}

type Props = {
  integration: Integration;
  integrationId: string;
  lastJob: SyncJob | null;
  onRetryJob: (jobId: number) => void;
  retryPending: boolean;
};

export function SquareSyncStatus({
  integration,
  integrationId,
  lastJob,
  onRetryJob,
  retryPending,
}: Props) {
  const activeJob =
    lastJob && isRunningSyncStatus(lastJob.status) ? lastJob : null;

  return (
    <div className="space-y-4">
      {activeJob && (
        <Alert className="border-blue-500/40 bg-blue-500/5">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="font-medium text-foreground">{phaseLabel(activeJob.status)}</span>
              {' · '}
              Job #{activeJob.id}
            </span>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={`/settings/integrations/syncs/${activeJob.id}`}>
                Open job
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sync health</CardTitle>
          <CardDescription>Integration-level sync status from your last completed run</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Last synced</p>
              <p className="mt-1 text-sm font-medium">
                {integration.last_sync_at ? formatDateTime(integration.last_sync_at) : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last sync result</p>
              <div className="mt-1">{lastSyncStatusBadge(integration.last_sync_status)}</div>
            </div>
          </div>

          {integration.last_sync_error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{integration.last_sync_error}</AlertDescription>
            </Alert>
          )}

          {lastJob && (
            <div className="rounded-md border p-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Latest job #{lastJob.id}</span>
                <Badge
                  variant={
                    lastJob.status === 'failed'
                      ? 'destructive'
                      : lastJob.status === 'completed'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {lastJob.status}
                </Badge>
                {lastJob.recovery_action && (
                  <Badge variant="outline" className="text-xs">
                    {formatRecoveryActionLabel(lastJob.recovery_action)}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{formatDateTime(lastJob.created_at)}</span>
              </div>

              {lastJob.error_message && !isBenignStopMessage(lastJob.status, lastJob.error_message) && (
                <p className="text-sm text-destructive">{lastJob.error_message}</p>
              )}

              {lastJob.status === 'stopped' && (lastJob.successors?.length ?? 0) > 0 && (
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-0.5">
                  {(lastJob.successors ?? []).map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/settings/integrations/syncs/${s.id}`}
                        className="underline font-medium text-foreground"
                      >
                        Job #{s.id}
                      </Link>
                      {formatRecoveryActionLabel(s.recovery_action)
                        ? ` · ${formatRecoveryActionLabel(s.recovery_action)}`
                        : ''}
                      {' · '}
                      {s.status}
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/settings/integrations/syncs?integration_id=${integrationId}`}>
                    <Activity className="h-4 w-4 mr-1" />
                    View sync jobs
                  </Link>
                </Button>
                {lastJob.status === 'stopped' &&
                  (lastJob.successors?.length ?? 0) > 0 &&
                  ((lastJob.successors?.length ?? 0) === 1 && lastJob.latest_successor ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/settings/integrations/syncs/${lastJob.latest_successor.id}`}>
                        View recovery job
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/settings/integrations/syncs?integration_id=${integrationId}&highlight_job=${lastJob.id}`}
                      >
                        View recovery chain
                      </Link>
                    </Button>
                  ))}
                {(lastJob.status === 'failed' || lastJob.status === 'completed') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetryJob(lastJob.id)}
                    disabled={retryPending}
                  >
                    {retryPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Retry job
                  </Button>
                )}
              </div>
            </div>
          )}

          {!lastJob && !integration.last_sync_at && (
            <p className="text-sm text-muted-foreground">
              No sync jobs yet. Use Sync now to pull your Square data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function isSquareSyncBlocked(lastJob: SyncJob | null): boolean {
  return Boolean(lastJob && isRunningSyncStatus(lastJob.status));
}
