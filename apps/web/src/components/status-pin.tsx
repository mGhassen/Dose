"use client";

import { cn } from "@kit/lib/utils";

export interface StatusPinProps {
  active: boolean;
  size?: "sm" | "md";
  title?: string;
  className?: string;
}

const sizeClasses = {
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
};

export function StatusPin({ active, size = "md", title, className }: StatusPinProps) {
  const label = title ?? (active ? "Active" : "Inactive");
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-block rounded-full shrink-0",
        sizeClasses[size],
        active ? "bg-green-500" : "bg-red-500",
        className
      )}
    />
  );
}
