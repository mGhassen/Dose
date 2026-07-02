'use client';

import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SyncFamilyStep, SyncJobFamilyMember } from '@kit/types';
import { cn } from '@kit/ui/utils';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
} from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';
import { isFetchStep, stepDetailsText, jobShortLabel } from './sync-steps-utils';

const ROW_HEIGHT = 32;

type Props = {
  steps: SyncFamilyStep[];
  jobsById: Map<number, SyncJobFamilyMember>;
  selectedStepId: number | null;
  onSelectStep: (step: SyncFamilyStep) => void;
  scrollToStepId?: number | null;
  showJobColumn?: boolean;
};

function statusIcon(status: string) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    case 'running':
      return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  }
}

export function SyncStepsList({
  steps,
  jobsById,
  selectedStepId,
  onSelectStep,
  scrollToStepId,
  showJobColumn = true,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: steps.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  useEffect(() => {
    if (scrollToStepId == null) return;
    const idx = steps.findIndex((s) => s.id === scrollToStepId);
    if (idx >= 0) virtualizer.scrollToIndex(idx, { align: 'center' });
  }, [scrollToStepId, steps, virtualizer]);

  if (steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        No steps match filters
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 min-h-0 overflow-auto">
      <div
        className="grid text-xs font-medium text-muted-foreground border-b bg-muted/30 sticky top-0 z-10"
        style={{
          gridTemplateColumns: showJobColumn
            ? '88px 72px 56px 1fr 64px 48px 48px minmax(80px, 160px)'
            : '88px 56px 1fr 64px 48px 48px minmax(80px, 160px)',
          height: ROW_HEIGHT,
        }}
      >
        <span className="px-2 flex items-center">Time</span>
        {showJobColumn && <span className="px-2 flex items-center">Job</span>}
        <span className="px-2 flex items-center">Phase</span>
        <span className="px-2 flex items-center">Step</span>
        <span className="px-2 flex items-center">Entries</span>
        <span className="px-2 flex items-center">Err</span>
        <span className="px-2 flex items-center">Status</span>
        <span className="px-2 flex items-center truncate">Details</span>
      </div>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const step = steps[vItem.index];
          const job = jobsById.get(step.job_id);
          const details = stepDetailsText(step.details);
          const selected = selectedStepId === step.id;
          const hasError = step.error_count > 0 || step.status === 'failed';

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step)}
              className={cn(
                'absolute left-0 w-full grid text-xs border-b text-left hover:bg-muted/50 transition-colors',
                selected && 'bg-primary/10',
                hasError && 'border-l-2 border-l-destructive'
              )}
              style={{
                height: ROW_HEIGHT,
                transform: `translateY(${vItem.start}px)`,
                gridTemplateColumns: showJobColumn
                  ? '88px 72px 56px 1fr 64px 48px 48px minmax(80px, 160px)'
                  : '88px 56px 1fr 64px 48px 48px minmax(80px, 160px)',
              }}
            >
              <span className="px-2 flex items-center truncate text-muted-foreground">
                {step.updated_at ? formatDateTime(step.updated_at).split(' ').slice(-1)[0] : '—'}
              </span>
              {showJobColumn && (
                <span className="px-2 flex items-center truncate font-mono text-[10px]">
                  {job ? jobShortLabel(job) : `#${step.job_id}`}
                </span>
              )}
              <span className="px-2 flex items-center">
                <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                  {isFetchStep(step.name) ? 'fetch' : 'proc'}
                </span>
              </span>
              <span className="px-2 flex items-center gap-1.5 min-w-0">
                {statusIcon(step.status)}
                <span className="truncate font-medium">{step.name}</span>
              </span>
              <span className="px-2 flex items-center tabular-nums">{step.entry_count}</span>
              <span
                className={cn(
                  'px-2 flex items-center tabular-nums',
                  step.error_count > 0 && 'text-destructive font-medium'
                )}
              >
                {step.error_count || '—'}
              </span>
              <span className="px-2 flex items-center">{step.status}</span>
              <span className="px-2 flex items-center truncate text-muted-foreground">{details}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
