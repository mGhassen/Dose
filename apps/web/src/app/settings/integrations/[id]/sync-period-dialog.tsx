"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatShortDate } from '@kit/lib/date-format';
import { SyncPeriodForm, type SyncPeriodSelection } from './sync-period-form';

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
  onConfirm: (selection: SyncPeriodSelection) => void | Promise<void>;
  isPending?: boolean;
  confirmLabel?: string;
}

export function SyncPeriodDialog({ open, onOpenChange, lastSyncAt, onConfirm, isPending, confirmLabel = 'Start sync' }: Props) {
  const [selection, setSelection] = useState<SyncPeriodSelection | null>(null);

  const handleConfirm = async () => {
    if (!selection) return;
    await onConfirm(selection);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Sync data period</DialogTitle>
          <DialogDescription>
            Choose which time range of orders and payments to pull from Square.
          </DialogDescription>
        </DialogHeader>

        <SyncPeriodForm lastSyncAt={lastSyncAt} onChange={setSelection} />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || !selection}>
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
