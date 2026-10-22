import { Check } from 'lucide-react';

import { SilkPoster } from '@/components/motion/silk-poster';
import { WebGLGate } from '@/components/motion/webgl-gate';
import { ModelMark } from '@/components/ui/model-mark';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { cn } from '@/lib/utils/cn';

import type { BrandQuote } from '../content/copy';

// Code-split: the shader loads only when the gate opens (never on phones or with reduced motion).
const Silk = lazyWithRetry(
  () => import('@/components/vendor/reactbits/silk').then(module => ({ default: module.Silk })),
  { silent: true },
);

const A_LINES = ['92%', '100%', '78%', '88%', '54%'] as const;
const B_LINES = ['100%', '84%', '96%', '70%', '62%'] as const;
const VOTES = ['A is better', 'Tie', 'Both bad', 'B is better'] as const;

function Lines({ widths }: { widths: readonly string[] }) {
  return (
    <span className="grid gap-2">
      {widths.map((width, index) => (
        <span key={index} className="block h-1.5 rounded-full bg-fg/12" style={{ width }} />
      ))}
    </span>
  );
}

function Pane({ side, picked }: { side: 'a' | 'b'; picked?: boolean }) {
  return (
    <div
      className={cn(
        'grid content-start gap-4 p-4',
        side === 'a' ? 'surface-a' : 'surface-b',
        picked && 'glow-b',
      )}
    >
      <div className="flex items-center gap-2.5">
        <ModelMark name={side === 'a' ? 'A' : 'B'} who={side} size="sm" />
        <span className="text-ui-sm font-medium text-fg">Answer {side.toUpperCase()}</span>
        {picked ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-mind-b-edge bg-mind-b-tint px-2 py-0.5 text-caption font-medium text-mind-b-text">
            <Check aria-hidden="true" className="size-3" strokeWidth={3} />
            Picked
          </span>
        ) : null}
      </div>
      <Lines widths={side === 'a' ? A_LINES : B_LINES} />
    </div>
  );
}

/** A still picture of one battle: the prompt, two anonymous answers and the vote. Decorative. */
function SampleDuel() {
  return (
    <div
      aria-hidden="true"
      className="grid w-full max-w-xl gap-3 select-none motion-safe:animate-fade-in"
    >
      <div className="surface-duel flex items-center gap-3 px-4 py-3">
        <ModelMark name="You" who="human" size="sm" />
        <span className="text-ui-sm text-fg">
          Review this function and tell me what it gets wrong.
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Pane side="a" />
        <Pane side="b" picked />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {VOTES.map(label => (
          <span
            key={label}
            className={cn(
              'grid h-10 place-items-center rounded-md border text-caption font-medium',
              label === 'B is better'
                ? 'border-transparent bg-mind-b text-on-accent shadow-lift'
                : 'border-line bg-surface-2 text-fg-soft',
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The right half of the sign-in pages on wide screens, pinned to the viewport while the form
 * scrolls, so the quote always shows: a mesh of the two Minds' colours over a grid, with the
 * Silk shader faintly behind it (the static poster on phones, with reduced motion and without
 * WebGL2), a sample duel and one short quote. Complementary content, so it is an <aside>; the
 * sample and the moving background are decorative and hidden from assistive technology.
 */
export function BrandPanel({ quote }: { quote: BrandQuote }) {
  return (
    <aside
      aria-label="About DualMind Arena"
      className="relative isolate hidden overflow-hidden border-l border-line mesh-duel lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-between lg:gap-10 lg:self-start lg:px-10 lg:py-12 xl:px-14"
    >
      <WebGLGate className="absolute inset-0 -z-10 opacity-35" poster={<SilkPoster />}>
        {({ paused, maxDpr }) => (
          <Silk
            color="--bg-deep"
            sheenColor="--mind-a"
            speed={3}
            noiseIntensity={0.8}
            sheen={0.95}
            depth={0.6}
            glow={0.65}
            paused={paused}
            maxDpr={maxDpr}
          />
        )}
      </WebGLGate>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid opacity-60" />
      <p className="kicker">One prompt, two blind answers</p>
      <div className="grid flex-1 place-items-center">
        <SampleDuel />
      </div>
      <figure className="max-w-md surface-float p-6">
        <blockquote className="text-h3 text-fg">
          <p>
            <span aria-hidden="true">&ldquo;</span>
            {quote.text}
            <span aria-hidden="true">&rdquo;</span>
          </p>
        </blockquote>
        <figcaption className="mt-4 eyebrow text-muted">{quote.source}</figcaption>
      </figure>
    </aside>
  );
}
