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
    <nav aria-label="Sync wizard progress" className="flex items-center gap-2 w-full">
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const canClick = onStepClick && index < currentStep;

        return (
          <div key={step.id} className="flex items-center gap-2 flex-1 min-w-0">
            {index > 0 && <div className={cn('h-px flex-1', isComplete || isCurrent ? 'bg-primary' : 'bg-border')} />}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onStepClick?.(index)}
              className={cn(
                'flex items-center gap-2 shrink-0 text-sm font-medium transition-colors',
                canClick && 'cursor-pointer hover:text-primary',
                !canClick && 'cursor-default',
                isCurrent && 'text-primary',
                isComplete && 'text-foreground',
                !isCurrent && !isComplete && 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border text-xs',
                  isCurrent && 'border-primary bg-primary text-primary-foreground',
                  isComplete && 'border-primary bg-primary/10 text-primary',
                  !isCurrent && !isComplete && 'border-muted-foreground/30'
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="hidden sm:inline truncate">{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
