"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";

import { useDisclosure } from "@kit/hooks/use-disclosure";
import { formatDate } from "@kit/lib/date-format";

import { Calendar } from "@kit/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@kit/ui/popover";

import { cn } from "./utils";

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
}

function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  id,
  className,
  fromYear = 2000,
  toYear = new Date().getFullYear(),
}: DatePickerProps) {
  const { isOpen, onClose, onToggle } = useDisclosure();
  const dateOnly = value ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : undefined;

  const triggerClassName = cn(
    "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-base shadow-none ring-offset-background md:text-sm",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    !value && "text-muted-foreground",
    className
  );

  return (
    <Popover open={isOpen} onOpenChange={onToggle} modal>
      <PopoverTrigger asChild>
        <button type="button" id={id} disabled={disabled} className={triggerClassName}>
          <span className="flex-1 truncate text-left">{value ? formatDate(value) : placeholder}</span>
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={dateOnly}
          onSelect={(selected) => {
            onChange?.(selected);
            onClose();
          }}
          fromYear={fromYear}
          toYear={toYear}
          defaultMonth={value ?? new Date()}
          className="border-0 p-3"
        />
      </PopoverContent>
    </Popover>
  );
}

DatePicker.displayName = "DatePicker";

export { DatePicker };
