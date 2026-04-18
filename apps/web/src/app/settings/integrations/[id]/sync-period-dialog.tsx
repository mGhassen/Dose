"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Label } from '@kit/ui/label';
import { Button } from '@kit/ui/button';
import { DatePicker } from '@kit/ui/date-picker';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatDateTime } from '@kit/lib/date-format';

export type SyncPeriodMode = 'last_sync' | 'custom' | 'all';

export interface SyncPeriodSelection {
  mode: SyncPeriodMode;
  startAt?: string;
  endAt?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastSyncAt: string | null | undefined;
  onConfirm: (selection: SyncPeriodSelection) => void | Promise<void>;
  isPending?: boolean;
}

export function SyncPeriodDialog({ open, onOpenChange, lastSyncAt, onConfirm, isPending }: Props) {
  const hasLastSync = Boolean(lastSyncAt);
  const [mode, setMode] = useState<SyncPeriodMode>(hasLastSync ? 'last_sync' : 'all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());

  useEffect(() => {
    if (open) {
      setMode(hasLastSync ? 'last_sync' : 'all');
      setStartDate(undefined);
      setEndDate(new Date());
    }
  }, [open, hasLastSync]);

  const now = new Date();
  const customInvalid =
    mode === 'custom' && (!startDate || !endDate || startDate > endDate || endDate > now);

  const handleConfirm = async () => {
    if (mode === 'custom') {
      if (!startDate || !endDate) return;
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      await onConfirm({ mode, startAt: start.toISOString(), endAt: end.toISOString() });
      return;
    }
    await onConfirm({ mode });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Sync data period</DialogTitle>
          <DialogDescription>
            Choose which time range of orders and payments to pull from Square. Catalog and locations are always refreshed.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as SyncPeriodMode)} className="gap-3 py-2">
          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem
              value="last_sync"
              id="period-last-sync"
              disabled={!hasLastSync}
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="period-last-sync" className="font-medium">
                Since last sync
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {hasLastSync
                  ? `Starts from ${formatDateTime(lastSyncAt as string)}`
                  : 'No previous sync yet — choose another option.'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="custom" id="period-custom" className="mt-1" />
            <div className="flex-1 space-y-3">
              <Label htmlFor="period-custom" className="font-medium">
                Specific period
              </Label>
              {mode === 'custom' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="period-start" className="text-xs text-muted-foreground">Start</Label>
                    <DatePicker
                      id="period-start"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Start date"
                      toYear={now.getFullYear()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="period-end" className="text-xs text-muted-foreground">End</Label>
                    <DatePicker
                      id="period-end"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="End date"
                      toYear={now.getFullYear()}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border p-3">
            <RadioGroupItem value="all" id="period-all" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="period-all" className="font-medium">
                All from start
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Pull the last 7 years of data. This may take a while.
              </p>
            </div>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isPending || customInvalid}>
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Start sync
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
