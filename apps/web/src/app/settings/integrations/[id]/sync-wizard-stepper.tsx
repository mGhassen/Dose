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
  return (
    <nav aria-label="Sync wizard progress" className="w-full overflow-x-auto pb-1">
      <ol className="flex min-w-max items-start">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const canClick = onStepClick && index < currentStep;
          const isLast = index === steps.length - 1;
          const lineActive = index < currentStep;

          return (
            <li key={step.id} className={cn('flex items-start', !isLast && 'flex-1 min-w-[5.5rem]')}>
              <div className="flex w-[5.5rem] shrink-0 flex-col items-center gap-2 sm:w-[6.5rem]">
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && onStepClick?.(index)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors',
                    canClick && 'cursor-pointer hover:border-primary',
                    !canClick && 'cursor-default',
                    isCurrent && 'border-primary bg-primary text-primary-foreground',
                    isComplete && 'border-primary bg-primary/10 text-primary',
                    !isCurrent && !isComplete && 'border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                </button>
                <span
                  className={cn(
                    'px-1 text-center text-xs leading-tight',
                    isCurrent && 'font-medium text-primary',
                    isComplete && 'text-foreground',
                    !isCurrent && !isComplete && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mx-1 mt-4 h-px min-w-[1rem] flex-1',
                    lineActive ? 'bg-primary' : 'bg-border'
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
