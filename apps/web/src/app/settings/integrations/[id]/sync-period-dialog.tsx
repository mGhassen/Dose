"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@kit/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Label } from '@kit/ui/label';
import { Button } from '@kit/ui/button';
import { DatePicker } from '@kit/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatDateTime, formatShortDate } from '@kit/lib/date-format';
import { getDateRangeForPreset, type DatePeriodPreset } from '@kit/lib/date-periods';
import { dateToYYYYMMDD, parseYYYYMMDDToLocalDate } from '@kit/lib/date-utils';
import { useMetadataEnum } from '@kit/hooks';

export type SyncPeriodMode = 'last_sync' | 'custom' | 'all';

const CUSTOM_VALUE = 'custom';
const DEFAULT_PRESET = 'this_year';

export interface SyncPeriodSelection {
  mode: SyncPeriodMode;
  startAt?: string;
  endAt?: string;
  presetLabel?: string;
}

interface PresetOption {
  name: string;
  label: string;
}

export function detectSyncPeriodPreset(
  startDate: Date | undefined,
  endDate: Date | undefined,
  presets: PresetOption[]
): string {
  if (!startDate || !endDate) return CUSTOM_VALUE;
  const range = {
    startDate: dateToYYYYMMDD(startDate),
    endDate: dateToYYYYMMDD(endDate),
  };
  for (const p of presets) {
    if (p.name === CUSTOM_VALUE) continue;
    try {
      const presetRange = getDateRangeForPreset(p.name as DatePeriodPreset);
      if (presetRange.startDate === range.startDate && presetRange.endDate === range.endDate) return p.name;
    } catch {
      /* skip */
    }
  }
  return CUSTOM_VALUE;
}

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
  /** Primary action label (e.g. "Continue" when period is chosen before other steps). */
  confirmLabel?: string;
}

export function SyncPeriodDialog({ open, onOpenChange, lastSyncAt, onConfirm, isPending, confirmLabel = 'Start sync' }: Props) {
  const hasLastSync = Boolean(lastSyncAt);
  const { data: presetsFromApi = [], isLoading: presetsLoading } = useMetadataEnum('GlobalDateFilterPreset');
  const presets = useMemo<PresetOption[]>(
    () => presetsFromApi.map((p) => ({ name: p.name, label: p.label ?? p.name })),
    [presetsFromApi]
  );

  const [mode, setMode] = useState<SyncPeriodMode>(hasLastSync ? 'last_sync' : 'all');
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());

  const applyPreset = useCallback((name: string) => {
    if (name === CUSTOM_VALUE) return;
    const range = getDateRangeForPreset(name as DatePeriodPreset);
    setStartDate(parseYYYYMMDDToLocalDate(range.startDate));
    setEndDate(parseYYYYMMDDToLocalDate(range.endDate));
  }, []);

  useEffect(() => {
    if (open) {
      setMode(hasLastSync ? 'last_sync' : 'all');
      setPreset(DEFAULT_PRESET);
      setStartDate(undefined);
      setEndDate(new Date());
    }
  }, [open, hasLastSync]);

  const detectPresetFromDates = useCallback(
    (start: Date | undefined, end: Date | undefined) => detectSyncPeriodPreset(start, end, presets),
    [presets]
  );

  const handleModeChange = (v: SyncPeriodMode) => {
    setMode(v);
    if (v === 'custom') {
      setPreset(DEFAULT_PRESET);
      applyPreset(DEFAULT_PRESET);
    }
  };

  const handlePresetChange = (v: string) => {
    setPreset(v);
    if (v !== CUSTOM_VALUE) {
      applyPreset(v);
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    setPreset(detectPresetFromDates(date, endDate));
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    setPreset(detectPresetFromDates(startDate, date));
  };

  const now = new Date();
  const customInvalid =
    mode === 'custom' && (!startDate || !endDate || startDate > endDate || endDate > now);

  const presetLabel =
    preset === CUSTOM_VALUE ? undefined : presets.find((p) => p.name === preset)?.label;

  const handleConfirm = async () => {
    if (mode === 'custom') {
      if (!startDate || !endDate) return;
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      await onConfirm({
        mode,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        presetLabel,
      });
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

        <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as SyncPeriodMode)} className="gap-3 py-2">
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
                <>
                  <Select
                    value={preset}
                    onValueChange={handlePresetChange}
                    disabled={presetsLoading || presets.length === 0}
                  >
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder={presetsLoading ? 'Loading…' : 'Select period'} />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="period-start" className="text-xs text-muted-foreground">Start</Label>
                      <DatePicker
                        id="period-start"
                        value={startDate}
                        onChange={handleStartDateChange}
                        placeholder="Start date"
                        toYear={now.getFullYear()}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="period-end" className="text-xs text-muted-foreground">End</Label>
                      <DatePicker
                        id="period-end"
                        value={endDate}
                        onChange={handleEndDateChange}
                        placeholder="End date"
                        toYear={now.getFullYear()}
                      />
                    </div>
                  </div>
                </>
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
                {confirmLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
