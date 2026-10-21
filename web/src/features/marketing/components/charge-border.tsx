import { useEffect, useState } from 'react';

import { WebGLGate } from '@/components/motion/webgl-gate';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

const ElectricBorder = lazyWithRetry(() =>
  import('@/components/vendor/reactbits/electric-border').then(module => ({
    default: module.ElectricBorder,
  })),
  { silent: true },
);

/** Milliseconds the current runs before it fades into the pane's static terra outline. */
const CHARGE_MS = 1800;
/** Time for the fade-out, after which the WebGL layer unmounts. */
const FADE_MS = 700;

/**
 * The reveal on the pane you picked: a one-shot electric current around its border (React Bits
 * Electric Border, behind the WebGL gate) that settles into the static outline the pane draws
 * itself. Nothing runs under reduced motion, on phones or without WebGL: the outline alone shows.
 */
export function ChargeBorder() {
  const [stage, setStage] = useState<'charging' | 'fading' | 'done'>('charging');

  useEffect(() => {
    const fade = window.setTimeout(() => setStage('fading'), CHARGE_MS);
    const done = window.setTimeout(() => setStage('done'), CHARGE_MS + FADE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(done);
    };
  }, []);

  if (stage === 'done') return null;
  return (
    <WebGLGate className="absolute inset-0 overflow-visible" rootMargin="0px">
      {({ paused, maxDpr }) => (
        <ElectricBorder
          color="--human"
          borderRadius={14}
          active={stage === 'charging'}
          strands={3}
          chaos={0.45}
          paused={paused}
          maxDpr={maxDpr}
        />
      )}
    </WebGLGate>
  );
}
