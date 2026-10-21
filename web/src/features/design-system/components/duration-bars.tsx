import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils/cn';
import { durations } from '@/styles/tokens';

const longest = Math.max(...durations.map(token => token.ms));

/**
 * Each duration token as a bar that grows over its own duration (transform only). Replay restarts
 * the animation by remounting the bars. With reduced motion the bars are simply at full width.
 */
export function DurationBars() {
  const reducedMotion = useReducedMotion();
  const [run, setRun] = useState(0);

  return (
    <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-h3 font-semibold">Durations</h3>
        <Button size="sm" variant="outline" onClick={() => setRun(count => count + 1)}>
          <RotateCcw aria-hidden="true" className="size-4" strokeWidth={2} />
          Replay
        </Button>
      </div>
      <ul className="mt-6 space-y-5">
        {durations.map(token => (
          <li
            key={token.name}
            className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)_4.5rem] sm:items-center sm:gap-5"
          >
            <div className="min-w-0">
              <code className="text-caption text-fg">{token.name}</code>
              <p className="text-caption text-muted">{token.use}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2 ring-1 ring-line ring-inset">
              <div
                key={run}
                className="h-full origin-left animate-grow rounded-full bg-mind-a"
                style={{
                  width: `${(token.ms / longest) * 100}%`,
                  animationDuration: `var(${token.name})`,
                }}
              />
            </div>
            <p className="font-mono text-ui-sm text-fg-soft tabular-nums sm:text-right">
              {token.ms} ms
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center gap-2 text-caption text-muted">
        <span
          aria-hidden="true"
          className={cn('size-2 shrink-0 rounded-full', reducedMotion ? 'bg-warn' : 'bg-ok')}
        />
        {reducedMotion
          ? 'Reduced motion is on: the bars appear at their final width and nothing moves.'
          : 'Each bar grows over its own duration with --ease-out-expo, animating transform only.'}
      </p>
    </div>
  );
}
