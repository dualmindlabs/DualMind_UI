import { useEffect, useState } from 'react';

import { WebGLGate } from '@/components/motion/webgl-gate';
import { Button } from '@/components/ui/button';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { cn } from '@/lib/utils/cn';

import { EffectFrame } from './effect-frame';
import { MindBadge } from './mind-badge';

const ElectricBorder = lazyWithRetry(
  () =>
    import('@/components/vendor/reactbits/electric-border').then(module => ({
      default: module.ElectricBorder,
    })),
  { silent: true },
);

/** Milliseconds the current runs before it settles into the static terra outline. */
const CHARGE_MS = 1800;

/**
 * Electric Border at the reveal: the chosen pane gets a one-shot current that settles into a
 * static terra outline. The outline is plain CSS; only the current is WebGL, behind the gate.
 */
export function EffectDemoElectricBorder() {
  const [chosen, setChosen] = useState(false);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    if (!charging) return undefined;
    const timer = window.setTimeout(() => setCharging(false), CHARGE_MS);
    return () => window.clearTimeout(timer);
  }, [charging]);

  const choose = () => {
    setChosen(true);
    setCharging(true);
  };

  return (
    <EffectFrame effect="electric-border" stageClassName="p-10">
      <div className="grid w-full max-w-xs justify-items-center gap-4">
        <div
          className={cn(
            'relative w-full rounded-lg border bg-surface-2 p-4 shadow-raise transition-colors duration-(--dur-slow)',
            chosen ? 'border-human' : 'border-line',
          )}
        >
          <WebGLGate className="absolute inset-0 overflow-visible">
            {({ paused, maxDpr }) => (
              <ElectricBorder
                color="--human"
                borderRadius={14}
                active={charging}
                strands={3}
                chaos={0.45}
                paused={paused}
                maxDpr={maxDpr}
              />
            )}
          </WebGLGate>
          <div className="flex items-center gap-2.5">
            <MindBadge side="a" />
            <span className="text-ui font-semibold text-mind-a">Answer A</span>
          </div>
          <p className="mt-2 text-ui-sm text-fg-soft">
            {chosen ? 'Your pick. Mind A was Vega 7.' : 'Pick this answer to see the reveal.'}
          </p>
        </div>
        <Button size="sm" variant="human" onClick={choose}>
          {chosen ? 'Replay the reveal' : 'A is better'}
        </Button>
      </div>
    </EffectFrame>
  );
}
