"use client";

import * as React from "react";
import { Label } from "@kit/ui/label";
import { cn } from "@kit/lib/utils";

interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-wrap items-end gap-x-3 gap-y-2", className)}
      {...props}
    >
      {children}
    </div>
  )
);
InputGroup.displayName = "InputGroup";

interface InputGroupItemProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  labelClassName?: string;
  children: React.ReactNode;
}

const InputGroupItem = React.forwardRef<HTMLDivElement, InputGroupItemProps>(
  ({ className, label, labelClassName, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      {...props}
    >
      {label != null && (
        <Label className={cn("text-xs text-muted-foreground", labelClassName)}>
          {label}
        </Label>
      )}
      {children}
    </div>
  )
);
InputGroupItem.displayName = "InputGroupItem";

interface InputGroupAttachedProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  labelClassName?: string;
  input: React.ReactNode;
  addon: React.ReactNode;
  /** When 'default', addon is not styled as a merged button (e.g. for checkbox). When 'button', addon trigger gets merged look. */
  addonStyle?: "button" | "default";
}

const InputGroupAttached = React.forwardRef<HTMLDivElement, InputGroupAttachedProps>(
  ({ className, label, labelClassName, input, addon, addonStyle = "button", ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5", className)} {...props}>
      {label != null && (
        <Label className={cn("text-xs text-muted-foreground", labelClassName)}>
          {label}
        </Label>
      )}
      <div className="flex h-10 rounded-md border border-input overflow-hidden bg-background shadow-none">
        <div className="flex-1 min-w-0 flex [&_input]:h-full [&_input]:rounded-none [&_input]:border-0 [&_input]:rounded-l-md [&_input]:shadow-none [&_input]:py-0">
          {input}
        </div>
        <div className="w-px shrink-0 bg-border self-stretch" aria-hidden />
        <div
          className={cn(
            "flex shrink-0 items-center justify-center self-stretch min-w-[2.5rem]",
            addonStyle === "button" &&
              "bg-muted/20 [&_button]:h-full [&_button]:rounded-none [&_button]:border-0 [&_button]:rounded-r-md [&_button]:min-w-[100px] [&_button]:shadow-none [&_button]:bg-transparent [&_button]:hover:bg-muted/30",
            addonStyle === "default" && "px-2 leading-none [&_button]:m-0 [&_span]:m-0"
          )}
        >
          {addon}
        </div>
      </div>
    </div>
  )
);
InputGroupAttached.displayName = "InputGroupAttached";

export { InputGroup, InputGroupItem, InputGroupAttached };
