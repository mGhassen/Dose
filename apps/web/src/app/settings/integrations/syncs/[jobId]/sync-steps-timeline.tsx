'use client';

import React from 'react';
import type { SyncFamilyStep } from '@kit/types';
import { cn } from '@kit/ui/utils';
import { buildTimelineBuckets } from './sync-steps-utils';

type Props = {
  steps: SyncFamilyStep[];
  onBucketClick?: (startMs: number) => void;
};

export function SyncStepsTimeline({ steps, onBucketClick }: Props) {
  const buckets = buildTimelineBuckets(steps);
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  if (buckets.length === 0) return null;

  const first = buckets[0].start;
  const last = buckets[buckets.length - 1].end;

  return (
    <div className="px-3 py-2 border-b bg-muted/10">
      <div className="flex items-end gap-px h-10">
        {buckets.map((b, i) => (
          <button
            key={i}
            type="button"
            title={`${b.count} steps${b.failed ? `, ${b.failed} failed` : ''}`}
            onClick={() => onBucketClick?.(b.start)}
            className="flex-1 min-w-0 rounded-sm bg-primary/20 hover:bg-primary/30 transition-colors relative group"
            style={{ height: `${Math.max((b.count / maxCount) * 100, b.count > 0 ? 8 : 2)}%` }}
          >
            {b.failed > 0 && (
              <span
                className="absolute bottom-0 left-0 right-0 bg-destructive/80 rounded-sm"
                style={{ height: `${(b.failed / Math.max(b.count, 1)) * 100}%` }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{new Date(first).toLocaleTimeString()}</span>
        <span>{new Date(last).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
