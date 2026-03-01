"use client";

import { useState } from "react";
import {
  DATE_PERIOD_PRESETS,
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

const CUSTOM_VALUE = "custom";

export interface DashboardPeriodFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DashboardPeriodFilter({ value, onChange }: DashboardPeriodFilterProps) {
  const detectPreset = (range: DateRange): string => {
    const match = DATE_PERIOD_PRESETS.find((p) => {
      const presetRange = getDateRangeForPreset(p.value as DatePeriodPreset);
      return presetRange.startDate === range.startDate && presetRange.endDate === range.endDate;
    });
    return match?.value ?? CUSTOM_VALUE;
  };

  const [preset, setPreset] = useState<string>(() => detectPreset(value));
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({
    from: value.startDate ? new Date(value.startDate) : undefined,
    to: value.endDate ? new Date(value.endDate) : undefined,
  });
  const [rangePopoverOpen, setRangePopoverOpen] = useState(false);

  const selectLabel =
    preset === CUSTOM_VALUE
      ? `${formatShortDate(value.startDate)} – ${formatShortDate(value.endDate)}`
      : DATE_PERIOD_PRESETS.find((p) => p.value === preset)?.label ?? "This year";

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
      <Select value={preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px] h-9">
          <CalendarIcon className="h-4 w-4 text-muted-foreground mr-2" />
          <SelectValue>{selectLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DATE_PERIOD_PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_VALUE}>Custom</SelectItem>
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
              selected={customRange}
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
