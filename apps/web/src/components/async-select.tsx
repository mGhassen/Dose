"use client";

import { Label } from "@kit/ui/label";
import { UnifiedSelector } from "@/components/unified-selector";

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
  disabled = false,
  allowEmpty = true,
  required = false,
  className,
}: AsyncSelectProps) {
  const items = options.map((o) => ({
    id: o.value,
    name: o.label,
    description: o.description,
  }));

  return (
    <div className={`space-y-2 ${className || ""}`}>
      <UnifiedSelector
        label={label}
        required={required}
        type="item"
        items={items}
        isLoading={isLoading}
        selectedId={value !== null && value !== undefined ? value : undefined}
        onSelect={(item) => onChange(item.id === 0 ? null : item.id)}
        placeholder={isLoading ? "Loading..." : placeholder}
        disabled={disabled || isLoading}
        className={error ? "border-destructive" : undefined}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
