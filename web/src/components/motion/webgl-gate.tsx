import { type ReactNode, Suspense, useRef, useSyncExternalStore } from 'react';

import { useInView } from '@/hooks/use-in-view';
import { usePageVisible } from '@/hooks/use-page-visible';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import {
  readWebGLEnvironment,
  REDUCED_DATA_QUERY,
  SMALL_TOUCH_SCREEN_QUERY,
  type WebGLBlockReason,
  webglBlockReason,
} from '@/lib/motion/webgl-policy';
import { cn } from '@/lib/utils/cn';

/** What the gate hands to the effect it renders. */
export interface WebGLEffectProps {
  /** True while the gate is off-screen or the tab is hidden: stop the render loop. */
  paused: boolean;
  /** Device pixel ratio cap for the canvas (1.5 by default). */
  maxDpr: number;
}

interface WebGLGateProps {
  /**
   * Renders the effect. Load it with React.lazy so its code is only fetched when the gate opens:
   * `const LightRays = lazy(() => import(...).then(m => ({ default: m.LightRays })))`.
   */
  children: (props: WebGLEffectProps) => ReactNode;
  /** The static stand-in: shown first, and instead of the effect when the gate stays closed. */
  poster?: ReactNode;
  className?: string;
  maxDpr?: number;
  /** How far outside the viewport to start loading the effect. */
  rootMargin?: string;
}

/** `pending`: prerendered or not near the viewport yet. `static`: poster only. `live`: running. */
export type WebGLGateState = 'pending' | 'static' | 'live';

const ENVIRONMENT_QUERIES = [SMALL_TOUCH_SCREEN_QUERY, REDUCED_DATA_QUERY];

function subscribeEnvironment(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const lists = ENVIRONMENT_QUERIES.map(query => window.matchMedia(query));
  lists.forEach(list => list.addEventListener('change', onChange));
  return () => lists.forEach(list => list.removeEventListener('change', onChange));
}

/** Everything but reduced motion (read live through the hook); a string, so snapshots compare. */
function getEnvironmentSnapshot(): WebGLBlockReason | 'ok' {
  return webglBlockReason(readWebGLEnvironment(window, { reducedMotion: false })) ?? 'ok';
}

const getServerSnapshot = (): 'server' => 'server';

/**
 * The gate every WebGL effect goes through (design-direction.md, section 6, rule 3):
 *
 * - renders the static `poster` in the prerendered HTML, and keeps it when reduced motion is on,
 *   on touch-first small screens, with less than 4 GB of memory, with Save-Data, or without WebGL2;
 * - otherwise loads the effect when the gate comes within `rootMargin` of the viewport;
 * - pauses it while off-screen or while the tab is hidden, and caps the pixel ratio at 1.5.
 *
 * Decorative: the whole gate is hidden from assistive technology.
 */
export function WebGLGate({
  children,
  poster,
  className,
  maxDpr = 1.5,
  rootMargin = '200px',
}: WebGLGateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useShouldReduceMotion();
  const environment = useSyncExternalStore<WebGLBlockReason | 'ok' | 'server'>(
    subscribeEnvironment,
    getEnvironmentSnapshot,
    getServerSnapshot,
  );
  const near = useInView(ref, { once: true, rootMargin });
  const onScreen = useInView(ref);
  const pageVisible = usePageVisible();

  const prerendered = environment === 'server';
  const reason: WebGLBlockReason | null = reduce
    ? 'reduced-motion'
    : prerendered || environment === 'ok'
      ? null
      : environment;
  const state: WebGLGateState = reason ? 'static' : !prerendered && near ? 'live' : 'pending';

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-webgl={state}
      data-webgl-reason={reason ?? undefined}
      className={cn('pointer-events-none relative overflow-hidden', className)}
    >
      {poster}
      {state === 'live' ? (
        <div className="absolute inset-0 animate-fade-in">
          <Suspense fallback={null}>
            {children({ paused: !onScreen || !pageVisible, maxDpr })}
          </Suspense>
        </div>
      ) : null}
    </div>
  );
}
