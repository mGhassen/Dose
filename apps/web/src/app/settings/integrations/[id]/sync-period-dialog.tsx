"use client";

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { Label } from '@kit/ui/label';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatShortDate } from '@kit/lib/date-format';
import { countMonthsInSyncPeriod } from '@/lib/sync-period-utils';
import type { Integration } from '@kit/types';
import { SyncPeriodForm, isSyncPeriodValid, type SyncPeriodSelection } from './sync-period-form';

export type { SyncPeriodMode, SyncPeriodSelection } from './sync-period-form';

export function formatSyncPeriodSummary(selection: SyncPeriodSelection): string {
  if (selection.mode === 'last_sync') return 'Since last sync';
  if (selection.mode === 'all') return 'All from start';
  if (selection.presetLabel) return selection.presetLabel;
  if (selection.startAt && selection.endAt) {
    return `${formatShortDate(selection.startAt)} – ${formatShortDate(selection.endAt)}`;
  }
  return 'Custom date range';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastSyncAt: string | null | undefined;
  integration: Integration;
  onConfirm: (selection: SyncPeriodSelection, fragmentByMonth: boolean) => void | Promise<void>;
  isPending?: boolean;
  confirmLabel?: string;
}

export function SyncPeriodDialog({
  open,
  onOpenChange,
  lastSyncAt,
  integration,
  onConfirm,
  isPending,
  confirmLabel = 'Start sync',
}: Props) {
  const [selection, setSelection] = useState<SyncPeriodSelection | null>(null);
  const [fragmentByMonth, setFragmentByMonth] = useState(true);

  useEffect(() => {
    if (!open) {
      setSelection(null);
      setFragmentByMonth(true);
    }
  }, [open]);

  const monthCount = useMemo(() => {
    if (!selection || !isSyncPeriodValid(selection)) return 0;
    return countMonthsInSyncPeriod(integration, {
      mode: selection.mode,
      startAt: selection.startAt,
      endAt: selection.endAt,
    });
  }, [selection, integration]);

  const handleConfirm = async () => {
    if (!selection || !isSyncPeriodValid(selection)) return;
    await onConfirm(selection, monthCount > 1 && fragmentByMonth);
  };

  const valid = selection != null && isSyncPeriodValid(selection);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Sync data period</DialogTitle>
          <DialogDescription>
            Choose which time range of orders and payments to pull from Square.
          </DialogDescription>
        </DialogHeader>

        <SyncPeriodForm lastSyncAt={lastSyncAt} onChange={setSelection} hideIntro />

        {monthCount > 1 && (
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="sync-fragment-by-month"
              checked={fragmentByMonth}
              onCheckedChange={(v) => setFragmentByMonth(v === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="sync-fragment-by-month" className="font-medium cursor-pointer">
                Split into {monthCount} monthly jobs
              </Label>
              <p className="text-xs text-muted-foreground">
                Recommended for long periods — easier to recover if one month fails.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || !valid}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
