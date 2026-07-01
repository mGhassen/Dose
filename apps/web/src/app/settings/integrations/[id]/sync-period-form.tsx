"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Label } from '@kit/ui/label';
import { DatePicker } from '@kit/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { formatDateTime } from '@kit/lib/date-format';
import { getDateRangeForPreset, type DatePeriodPreset } from '@kit/lib/date-periods';
import { dateToYYYYMMDD, parseYYYYMMDDToLocalDate } from '@kit/lib/date-utils';
import { useMetadataEnum } from '@kit/hooks';
import type { FullSyncPeriod } from '@/lib/sync-period-utils';

export type SyncPeriodMode = FullSyncPeriod['mode'];

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

const CUSTOM_VALUE = 'custom';
const DEFAULT_PRESET = 'this_year';

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

export interface SyncPeriodFormProps {
  lastSyncAt: string | null | undefined;
  value?: SyncPeriodSelection | null;
  onChange: (selection: SyncPeriodSelection) => void;
  idPrefix?: string;
}

export function buildSelectionFromState(
  mode: SyncPeriodMode,
  startDate: Date | undefined,
  endDate: Date | undefined,
  presetLabel: string | undefined
): SyncPeriodSelection | null {
  const now = new Date();
  if (mode === 'custom') {
    if (!startDate || !endDate || startDate > endDate || endDate > now) return null;
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    return { mode, startAt: start.toISOString(), endAt: end.toISOString(), presetLabel };
  }
  return { mode };
}

export function SyncPeriodForm({ lastSyncAt, value, onChange, idPrefix = 'period' }: SyncPeriodFormProps) {
  const hasLastSync = Boolean(lastSyncAt);
  const { data: presetsFromApi = [], isLoading: presetsLoading } = useMetadataEnum('GlobalDateFilterPreset');
  const presets = useMemo<PresetOption[]>(
    () => presetsFromApi.map((p) => ({ name: p.name, label: p.label ?? p.name })),
    [presetsFromApi]
  );

  const [mode, setMode] = useState<SyncPeriodMode>(value?.mode ?? (hasLastSync ? 'last_sync' : 'all'));
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date());

  const applyPreset = useCallback((name: string) => {
    if (name === CUSTOM_VALUE) return;
    const range = getDateRangeForPreset(name as DatePeriodPreset);
    setStartDate(parseYYYYMMDDToLocalDate(range.startDate));
    setEndDate(parseYYYYMMDDToLocalDate(range.endDate));
  }, []);

  const detectPresetFromDates = useCallback(
    (start: Date | undefined, end: Date | undefined) => detectSyncPeriodPreset(start, end, presets),
    [presets]
  );

  const presetLabel =
    preset === CUSTOM_VALUE ? undefined : presets.find((p) => p.name === preset)?.label;

  const emitChange = useCallback(
    (m: SyncPeriodMode, start: Date | undefined, end: Date | undefined, pl?: string) => {
      const sel = buildSelectionFromState(m, start, end, pl);
      if (sel) onChange(sel);
    },
    [onChange]
  );

  const handleModeChange = (v: SyncPeriodMode) => {
    setMode(v);
    if (v === 'custom') {
      setPreset(DEFAULT_PRESET);
      applyPreset(DEFAULT_PRESET);
      const range = getDateRangeForPreset(DEFAULT_PRESET as DatePeriodPreset);
      const start = parseYYYYMMDDToLocalDate(range.startDate);
      const end = parseYYYYMMDDToLocalDate(range.endDate);
      setStartDate(start);
      setEndDate(end);
      emitChange(v, start, end, presets.find((p) => p.name === DEFAULT_PRESET)?.label);
    } else {
      onChange({ mode: v });
    }
  };

  const handlePresetChange = (v: string) => {
    setPreset(v);
    if (v !== CUSTOM_VALUE) {
      applyPreset(v);
      const range = getDateRangeForPreset(v as DatePeriodPreset);
      const start = parseYYYYMMDDToLocalDate(range.startDate);
      const end = parseYYYYMMDDToLocalDate(range.endDate);
      emitChange(mode, start, end, presets.find((p) => p.name === v)?.label);
    }
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    const nextPreset = detectPresetFromDates(date, endDate);
    setPreset(nextPreset);
    const pl = nextPreset === CUSTOM_VALUE ? undefined : presets.find((p) => p.name === nextPreset)?.label;
    emitChange(mode, date, endDate, pl);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    const nextPreset = detectPresetFromDates(startDate, date);
    setPreset(nextPreset);
    const pl = nextPreset === CUSTOM_VALUE ? undefined : presets.find((p) => p.name === nextPreset)?.label;
    emitChange(mode, startDate, date, pl);
  };

  useEffect(() => {
    if (value?.mode && value.mode !== mode) setMode(value.mode);
  }, [value?.mode]);

  const now = new Date();

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Choose which time range of orders and payments to pull from Square. Catalog and locations are always refreshed.
      </p>
      <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as SyncPeriodMode)} className="gap-3">
        <div className="flex items-start gap-3 rounded-md border p-3">
          <RadioGroupItem
            value="last_sync"
            id={`${idPrefix}-last-sync`}
            disabled={!hasLastSync}
            className="mt-1"
          />
          <div className="flex-1">
            <Label htmlFor={`${idPrefix}-last-sync`} className="font-medium">
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
          <RadioGroupItem value="custom" id={`${idPrefix}-custom`} className="mt-1" />
          <div className="flex-1 space-y-3">
            <Label htmlFor={`${idPrefix}-custom`} className="font-medium">
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
                    <Label htmlFor={`${idPrefix}-start`} className="text-xs text-muted-foreground">Start</Label>
                    <DatePicker
                      id={`${idPrefix}-start`}
                      value={startDate}
                      onChange={handleStartDateChange}
                      placeholder="Start date"
                      toYear={now.getFullYear()}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`${idPrefix}-end`} className="text-xs text-muted-foreground">End</Label>
                    <DatePicker
                      id={`${idPrefix}-end`}
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
          <RadioGroupItem value="all" id={`${idPrefix}-all`} className="mt-1" />
          <div className="flex-1">
            <Label htmlFor={`${idPrefix}-all`} className="font-medium">
              All from start
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Pull the last 7 years of data. This may take a while.
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}

export function isSyncPeriodValid(selection: SyncPeriodSelection | null | undefined): boolean {
  if (!selection) return false;
  if (selection.mode !== 'custom') return true;
  return Boolean(selection.startAt && selection.endAt && new Date(selection.startAt) <= new Date(selection.endAt));
}
