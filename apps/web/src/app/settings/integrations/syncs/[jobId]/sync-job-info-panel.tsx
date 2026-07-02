'use client';

import React from 'react';
import type { SyncJobFamilyMember } from '@kit/types';
import { Button } from '@kit/ui/button';
import { X } from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';
import { formatRecoveryActionLabel } from '@kit/lib/sync-job-utils';
import { jobDisplayLabel } from './sync-steps-utils';

type Props = {
  job: SyncJobFamilyMember;
  onClose: () => void;
};

export function SyncJobInfoPanel({ job, onClose }: Props) {
  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <p className="text-sm font-medium truncate">{jobDisplayLabel(job)}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-4 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{job.status}</dd>
          <dt className="text-muted-foreground">Type</dt>
          <dd>{job.sync_type}</dd>
          {job.recovery_action && (
            <>
              <dt className="text-muted-foreground">Recovery</dt>
              <dd>{formatRecoveryActionLabel(job.recovery_action)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatDateTime(job.created_at)}</dd>
          <dt className="text-muted-foreground">Started</dt>
          <dd>{job.started_at ? formatDateTime(job.started_at) : '—'}</dd>
          <dt className="text-muted-foreground">Completed</dt>
          <dd>{job.completed_at ? formatDateTime(job.completed_at) : '—'}</dd>
          <dt className="text-muted-foreground">Staging job</dt>
          <dd className="font-mono">#{job.staging_job_id}</dd>
        </dl>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Staging</p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded border p-2">
              <p className="text-lg font-semibold">{job.staging.staged_rows}</p>
              <p className="text-[10px] text-muted-foreground">Staged</p>
            </div>
            <div className="rounded border p-2">
              <p className="text-lg font-semibold">{job.staging.processed_rows}</p>
              <p className="text-[10px] text-muted-foreground">Processed</p>
            </div>
            <div className="rounded border p-2">
              <p className="text-lg font-semibold">{job.staging.unprocessed_rows}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
          </dl>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Counts</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Steps</dt>
            <dd>{job.step_count}</dd>
            <dt className="text-muted-foreground">Entries</dt>
            <dd>{job.entry_count}</dd>
            <dt className="text-muted-foreground">Errors</dt>
            <dd className={job.error_count > 0 ? 'text-destructive font-medium' : ''}>{job.error_count}</dd>
          </dl>
        </div>

        {job.last_step && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Last step</p>
            <p className="text-xs">
              <span className="font-medium">{job.last_step.name}</span>
              <span className="text-muted-foreground"> · {job.last_step.status}</span>
            </p>
          </div>
        )}

        {Object.keys(job.stats).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Stats</p>
            <pre className="rounded border bg-muted/30 p-2 font-mono text-[10px] overflow-auto max-h-48">
              {JSON.stringify(job.stats, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
