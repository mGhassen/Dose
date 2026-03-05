"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getDateRangeForPreset,
  type DatePeriodPreset,
  type DateRange,
} from "@kit/lib/date-periods";
import { formatShortDate } from "@kit/lib/date-format";
import { dateToYYYYMMDD } from "@kit/lib/date-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { Button } from "@kit/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@kit/ui/popover";
import { Calendar } from "@kit/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { useMetadataEnum } from "@kit/hooks";

const CUSTOM_VALUE = "custom";

export interface DashboardPeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DashboardPeriodFilter({ value, onChange }: DashboardPeriodFilterProps) {
  const { data: presetsFromApi = [], isLoading } = useMetadataEnum("GlobalDateFilterPreset");
  const presets = useMemo(
    () => presetsFromApi.map((p) => ({ name: p.name, label: p.label ?? p.name })),
    [presetsFromApi]
  );

  const detectPreset = (range: DateRange): string => {
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
  };

  const [preset, setPreset] = useState<string>(() => detectPreset(value));

  useEffect(() => {
    const next = detectPreset(value);
    setPreset((prev) => (prev !== next ? next : prev));
  }, [value.startDate, value.endDate, presets]);

  type CalendarRange = { from?: Date; to?: Date };
  const [customRange, setCustomRange] = useState<CalendarRange>({
    from: value.startDate ? new Date(value.startDate) : undefined,
    to: value.endDate ? new Date(value.endDate) : undefined,
  });
  useEffect(() => {
    setCustomRange({
      from: value.startDate ? new Date(value.startDate) : undefined,
      to: value.endDate ? new Date(value.endDate) : undefined,
    });
  }, [value.startDate, value.endDate]);
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);

  const selectLabel =
    preset === CUSTOM_VALUE
      ? presets.find((p) => p.name === CUSTOM_VALUE)?.label ?? "Custom"
      : presets.find((p) => p.name === preset)?.label ?? (presets.length > 0 ? presets[0].label : "Period");

  const handlePresetChange = (v: string) => {
    setPreset(v);
    if (v === CUSTOM_VALUE) {
      setCustomRange({
        from: value.startDate ? new Date(value.startDate) : undefined,
        to: value.endDate ? new Date(value.endDate) : undefined,
      });
    } else {
      const range = getDateRangeForPreset(v as DatePeriodPreset);
      onChange(range);
    }
  };

  const handleCustomSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setCustomRange(range ?? {});
  };

  const handleSubmitRange = () => {
    if (customRange.from) {
      const endDate = customRange.to ?? customRange.from;
      onChange({
        startDate: dateToYYYYMMDD(customRange.from),
        endDate: dateToYYYYMMDD(endDate),
      });
      setRangePopoverOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={preset}
        onValueChange={handlePresetChange}
        disabled={isLoading || presets.length === 0}
      >
        <SelectTrigger className="w-[160px] h-9">
          <CalendarIcon className="h-4 w-4 text-muted-foreground mr-2" />
          <SelectValue placeholder={isLoading ? "Loading…" : undefined}>
            {selectLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.name} value={p.name}>
              {p.label ?? p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === CUSTOM_VALUE && (
        <Popover open={rangePopoverOpen} onOpenChange={setRangePopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 min-w-[180px] justify-start">
              {customRange.from
                ? customRange.to
                  ? `${formatShortDate(customRange.from)} – ${formatShortDate(customRange.to)}`
                  : `${formatShortDate(customRange.from)} – …`
                : "Pick range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <Calendar
              mode="range"
              selected={customRange.from != null ? { from: customRange.from, to: customRange.to ?? customRange.from } : undefined}
              onSelect={handleCustomSelect}
              numberOfMonths={2}
            />
            <div className="p-2 border-t">
              <Button size="sm" className="w-full" onClick={handleSubmitRange} disabled={!customRange.from}>
                Submit
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
