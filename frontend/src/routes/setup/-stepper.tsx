import { CheckIcon } from 'lucide-react';
import type * as React from 'react';

import { SETUP_STEPS, SETUP_STEP_LABELS } from '@/lib/constant';
import type { SetupStep } from '@/lib/interfaces';
import { cn } from '@/lib/utils';

type StepperProps = {
  currentStep: SetupStep;
};

function resolveState(
  index: number,
  currentIndex: number,
): 'completed' | 'active' | 'pending' {
  if (index < currentIndex) return 'completed';
  if (index === currentIndex) return 'active';
  return 'pending';
}

export function Stepper({ currentStep }: StepperProps): React.JSX.Element {
  const currentIndex = SETUP_STEPS.indexOf(currentStep);

  return (
    <nav
      aria-label="Progresso do setup"
      className="flex items-center justify-between"
    >
      {SETUP_STEPS.map((step, index) => {
        const state = resolveState(index, currentIndex);
        const isLast = index === SETUP_STEPS.length - 1;

        return (
          <div
            key={step}
            className="flex flex-1 items-center"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                  state === 'completed' &&
                    'bg-brand-blue-dark text-white shadow-sm',
                  state === 'active' &&
                    'bg-brand-orange text-white ring-[3px] ring-brand-orange/30 shadow-sm',
                  state === 'pending' &&
                    'border-2 border-muted-foreground/20 bg-transparent text-muted-foreground/50',
                )}
              >
                {state === 'completed' && (
                  <CheckIcon className="size-4 stroke-[3]" />
                )}
                {state !== 'completed' && index + 1}
              </div>
              <span
                className={cn(
                  'hidden text-[11px] font-medium tracking-wide uppercase sm:block transition-colors duration-300',
                  state === 'completed' && 'text-brand-blue-dark',
                  state === 'active' && 'text-foreground',
                  state === 'pending' && 'text-muted-foreground/50',
                )}
              >
                {SETUP_STEP_LABELS[step]}
              </span>
            </div>

            {!isLast && (
              <div className="mx-2 flex-1 sm:mx-3">
                <div
                  className={cn(
                    'h-px w-full transition-colors duration-500',
                    index < currentIndex && 'bg-brand-blue-dark/40',
                    index >= currentIndex && 'bg-border',
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
