'use client';

import React, { useState } from 'react';
import type { SyncFamilyStep } from '@kit/types';
import { useSyncStepEntries } from '@kit/hooks';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { Label } from '@kit/ui/label';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@kit/ui/utils';
import { payloadPreview } from './sync-steps-utils';

const PAGE_SIZE = 100;

type Props = {
  anchorJobId: number;
  step: SyncFamilyStep | null;
  selectedEntryId: number | null;
  onSelectEntry: (entryId: number | null) => void;
};

export function SyncStepEntriesPanel({
  anchorJobId,
  step,
  selectedEntryId,
  onSelectEntry,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [errorsOnly, setErrorsOnly] = useState(false);

  const { data, isLoading, isFetching } = useSyncStepEntries(
    anchorJobId,
    step?.id ?? null,
    { limit: PAGE_SIZE, offset, errors_only: errorsOnly }
  );

  React.useEffect(() => {
    setOffset(0);
    onSelectEntry(null);
  }, [step?.id, errorsOnly, onSelectEntry]);

  if (!step) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Select a step to view imported entries
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const total = data?.pagination.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{step.name}</p>
          <p className="text-xs text-muted-foreground">
            Job #{step.job_id} · {total} entries
            {data?.error_count ? ` · ${data.error_count} errors` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {(isLoading || isFetching) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <div className="flex items-center gap-2">
            <Checkbox
              id="entry-errors-only"
              checked={errorsOnly}
              onCheckedChange={(c) => setErrorsOnly(c === true)}
            />
            <Label htmlFor="entry-errors-only" className="text-xs font-normal">
              Errors only
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums w-16 text-center">
              {page}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {data?.message && entries.length === 0 && (
        <p className="px-3 py-2 text-xs text-muted-foreground">{data.message}</p>
      )}

      {!data?.message && step.entry_count === 0 && !isLoading && (
        <div className="p-3 text-xs text-muted-foreground space-y-2 overflow-auto">
          <p>No staging rows linked to this step.</p>
          {step.details && Object.keys(step.details).length > 0 && (
            <pre className="rounded border bg-muted/30 p-2 font-mono text-[10px] overflow-auto max-h-40">
              {JSON.stringify(step.details, null, 2)}
            </pre>
          )}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onSelectEntry(entry.id)}
            className={cn(
              'w-full text-left flex items-start gap-3 px-3 py-1.5 border-b text-xs hover:bg-muted/50',
              selectedEntryId === entry.id && 'bg-primary/10',
              entry.error_message && 'bg-destructive/5'
            )}
          >
            <span className="shrink-0 font-mono text-muted-foreground w-24 truncate">{entry.data_type}</span>
            <span className="shrink-0 font-mono w-32 truncate" title={entry.source_id}>
              {entry.source_id}
            </span>
            {entry.error_message && (
              <span className="shrink-0 text-destructive font-medium">ERR</span>
            )}
            <span className="min-w-0 truncate text-muted-foreground font-mono">
              {entry.error_message ?? payloadPreview(entry.payload)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
