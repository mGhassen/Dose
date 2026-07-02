"use client";

import { cn } from '@kit/ui';
import { Check } from 'lucide-react';

export interface WizardStep {
  id: string;
  label: string;
}

interface Props {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function SyncWizardStepper({ steps, currentStep, onStepClick }: Props) {
  const progress =
    steps.length <= 1 ? 0 : (currentStep / (steps.length - 1)) * 100;

  return (
    <nav aria-label="Sync wizard progress" className="relative w-full pt-1 pb-2">
      {steps.length > 1 && (
        <div
          className="absolute left-0 right-0 top-[1.125rem] h-px bg-border"
          aria-hidden
        >
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <ol className="relative flex justify-between gap-2">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const canClick = onStepClick && index < currentStep;

          const circle = (
            <span
              className={cn(
                'relative z-10 box-border flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-medium',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isComplete && 'border-primary text-primary',
                !isCurrent && !isComplete && 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {isComplete ? <Check className="size-4 shrink-0" /> : index + 1}
            </span>
          );

          return (
            <li
              key={step.id}
              className="flex min-w-0 flex-1 flex-col items-center gap-2 first:items-start last:items-end"
            >
              {canClick ? (
                <button
                  type="button"
                  onClick={() => onStepClick?.(index)}
                  className="rounded-full cursor-pointer hover:opacity-80"
                >
                  {circle}
                </button>
              ) : (
                circle
              )}
              <span
                className={cn(
                  'max-w-[6.5rem] text-center text-xs leading-tight',
                  index === 0 && 'text-left',
                  index === steps.length - 1 && 'text-right',
                  isCurrent && 'font-medium text-primary',
                  isComplete && 'text-foreground',
                  !isCurrent && !isComplete && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
