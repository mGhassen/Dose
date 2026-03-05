"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";

import { useDisclosure } from "@kit/hooks/use-disclosure";

import { Popover, PopoverContent, PopoverTrigger } from "@kit/ui/popover";
import { ScrollArea } from "@kit/ui/scroll-area";

import { cn } from "./utils";

const MINUTES_INTERVAL = 15;
const TIME_OPTIONS = (() => {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += MINUTES_INTERVAL) {
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return options;
})();

export interface TimePickerProps {
  value?: string | null;
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  disabled = false,
  id,
  className,
}: TimePickerProps) {
  const { isOpen, onClose, onToggle } = useDisclosure();

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
          <span className="flex-1 truncate text-left">{value || placeholder}</span>
          <ClockIcon className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <ScrollArea className="h-[280px] w-[120px]">
          <div className="p-1">
            {TIME_OPTIONS.map((time) => (
              <button
                key={time}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
                  "hover:bg-accent hover:text-accent-foreground",
                  value === time && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onChange?.(time);
                  onClose();
                }}
              >
                {time}
                {value === time && (
                  <span className="ml-auto text-primary" aria-hidden>✓</span>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

TimePicker.displayName = "TimePicker";

export { TimePicker };
