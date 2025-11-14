"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@kit/ui/select";
import { Label } from "@kit/ui/label";
import { Loader2 } from "lucide-react";

interface AsyncSelectOption {
  id: number | string;
  label: string;
  value: number | string;
  description?: string;
}

interface AsyncSelectProps {
  label?: string;
  value?: number | string | null;
  onChange: (value: number | string | null) => void;
  options: AsyncSelectOption[];
  isLoading?: boolean;
  error?: string;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyOptionLabel?: string;
  className?: string;
  required?: boolean;
}

export function AsyncSelect({
  label,
  value,
  onChange,
  options,
  isLoading = false,
  error,
  placeholder = "Select...",
  emptyMessage = "No options available",
  disabled = false,
  allowEmpty = true,
  emptyOptionLabel = "None",
  className,
  required = false,
}: AsyncSelectProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === "__none__" || newValue === "" || newValue === "null") {
      onChange(null);
    } else {
      // Find the option to get the correct type
      const option = options.find((opt) => opt.value.toString() === newValue);
      if (option) {
        onChange(option.value);
      } else {
        // If not found, try to parse as number first, then fallback to string
        const numValue = Number(newValue);
        onChange(isNaN(numValue) ? newValue : numValue);
      }
    }
  };

  const displayValue = value !== null && value !== undefined ? String(value) : (allowEmpty ? "__none__" : "");

  return (
    <div className={`space-y-2 ${className || ""}`}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select
        value={displayValue}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={error ? "border-destructive" : ""}>
          <SelectValue placeholder={isLoading ? "Loading..." : placeholder}>
            {isLoading && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
            {!isLoading && value !== null && value !== undefined && (
              <span>
                {options.find((opt) => opt.value.toString() === displayValue)?.label ||
                  displayValue}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : options.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <>
              {allowEmpty && (
                <SelectItem value="__none__">{emptyOptionLabel}</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.id} value={option.value.toString()}>
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {!error && options.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {options.length} option{options.length !== 1 ? "s" : ""} available
        </p>
      )}
    </div>
  );
}

