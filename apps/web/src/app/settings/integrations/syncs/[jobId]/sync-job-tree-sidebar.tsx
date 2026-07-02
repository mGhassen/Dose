'use client';

import React from 'react';
import type { SyncJobFamilyMember } from '@kit/types';
import { Button } from '@kit/ui/button';
import { ScrollArea } from '@kit/ui/scroll-area';
import { cn } from '@kit/ui/utils';
import { Info, Loader2 } from 'lucide-react';
import { jobDisplayLabel, jobShortLabel } from './sync-steps-utils';
import { isRunningSyncStatus } from '@kit/lib/sync-job-utils';
import { formatRecoveryActionLabel } from '@kit/lib/sync-job-utils';

type Props = {
  jobs: SyncJobFamilyMember[];
  selectedJobId: number | null;
  allJobsSelected: boolean;
  onSelectJob: (jobId: number | null, all: boolean) => void;
  onJobInfo: (job: SyncJobFamilyMember) => void;
};

function statusColor(status: string): string {
  if (status === 'completed') return 'text-emerald-600';
  if (status === 'failed') return 'text-destructive';
  if (isRunningSyncStatus(status)) return 'text-primary';
  return 'text-muted-foreground';
}

export function SyncJobTreeSidebar({
  jobs,
  selectedJobId,
  allJobsSelected,
  onSelectJob,
  onJobInfo,
}: Props) {
  return (
    <div className="flex flex-col h-full border-r bg-muted/20">
      <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Sync run · {jobs.length} job{jobs.length !== 1 ? 's' : ''}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          <button
            type="button"
            onClick={() => onSelectJob(null, true)}
            className={cn(
              'w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors',
              allJobsSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
            )}
          >
            All jobs
          </button>
          {jobs.map((job) => {
            const selected = !allJobsSelected && selectedJobId === job.id;
            const running = isRunningSyncStatus(job.status);
            return (
              <div
                key={job.id}
                className={cn(
                  'flex items-center gap-1 rounded-md pr-1',
                  selected ? 'bg-primary/10' : 'hover:bg-muted'
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectJob(job.id, false)}
                  className="flex-1 min-w-0 text-left px-2 py-1.5 text-sm"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {running && <Loader2 className="h-3 w-3 animate-spin shrink-0 text-primary" />}
                    <span className="truncate font-medium">{jobShortLabel(job)}</span>
                    <span className={cn('text-xs shrink-0', statusColor(job.status))}>{job.status}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                    <span>{job.step_count} steps</span>
                    <span>·</span>
                    <span>{job.entry_count} entries</span>
                    {job.error_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-destructive">{job.error_count} err</span>
                      </>
                    )}
                  </div>
                  {job.recovery_action && (
                    <span className="text-xs text-muted-foreground">
                      {formatRecoveryActionLabel(job.recovery_action)}
                    </span>
                  )}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onJobInfo(job)}
                  title={jobDisplayLabel(job)}
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
