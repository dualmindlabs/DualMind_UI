import { ArrowDown, ArrowUp, ArrowUpRight } from 'lucide-react';

import { RoleBadge } from '@/components/ui/role-badge';
import { cn } from '@/lib/utils/cn';

const chip =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-caption whitespace-nowrap text-fg-soft';

/**
 * A small, static picture of each step, drawn with the arena's own pieces (composer, panes,
 * verdict row, reveal). Decorative: the step text says what happens.
 */
export function StepVisual({ step }: { step: number }) {
  return (
    <div
      aria-hidden="true"
      className="mt-6 w-full max-w-md rounded-lg border border-line bg-surface-2 p-3 shadow-raise"
    >
      {step === 0 ? (
        <div className="flex h-11 items-center justify-between gap-3 rounded-full border border-line-strong bg-surface pr-1.5 pl-4">
          <span className="truncate text-ui-sm text-fg-soft">
            Write a haiku about merge conflicts
          </span>
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mind-a text-on-accent">
            <ArrowUp className="size-4" strokeWidth={2.25} />
          </span>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {(['a', 'b'] as const).map(side => (
            <div key={side} className="grid gap-2 rounded-md border border-line bg-surface p-2.5">
              <RoleBadge who={side} letterOnly size="sm" />
              <span className="h-1.5 w-11/12 rounded-full bg-line" />
              <span className="h-1.5 w-3/4 rounded-full bg-line" />
              <span className="h-1.5 w-5/6 rounded-full bg-line" />
            </div>
          ))}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid grid-cols-2 gap-2">
          {['A is better', 'Tie', 'Both are bad', 'B is better'].map((label, index) => (
            <span
              key={label}
              className={cn(chip, index === 0 && 'border-human bg-human-tint text-fg')}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-2">
          {(['a', 'b'] as const).map(side => (
            <div
              key={side}
              className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-2.5 py-2"
            >
              <span className="flex items-center gap-2">
                <RoleBadge who={side} letterOnly size="sm" />
                <span className="font-mono text-caption text-fg">Model name, revealed</span>
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-mono text-caption',
                  side === 'a' ? 'text-ok' : 'text-muted',
                )}
              >
                {side === 'a' ? (
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                ) : (
                  <ArrowDown className="size-3.5" strokeWidth={2} />
                )}
                Rating
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
