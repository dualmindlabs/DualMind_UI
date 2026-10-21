
import { SilkPoster } from '@/components/motion/silk-poster';
import { WebGLGate } from '@/components/motion/webgl-gate';

import type { BrandQuote } from '../content/copy';
import { lazyWithRetry } from '@/lib/lazy-with-retry';

// Code-split: the shader loads only when the gate opens (never on phones or with reduced motion).
const Silk = lazyWithRetry(() =>
  import('@/components/vendor/reactbits/silk').then(module => ({ default: module.Silk })),
  { silent: true },
);

/**
 * The right half of the sign-in pages on wide screens, pinned to the viewport while the form
 * scrolls, so the quote always shows: React Bits Silk in deep ink with a Mind A
 * sheen (the static poster on phones, with reduced motion and without WebGL2), and one short
 * quote on a glass card. Complementary content, so it is an <aside>; the moving background is
 * decorative and hidden from assistive technology by the gate.
 */
export function BrandPanel({ quote }: { quote: BrandQuote }) {
  return (
    <aside
      aria-label="About DualMind Arena"
      className="relative isolate hidden overflow-hidden border-l border-line bg-bg-deep lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-end lg:self-start"
    >
      <WebGLGate className="absolute inset-0 -z-10" poster={<SilkPoster />}>
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
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-linear-to-t from-bg-deep via-bg-deep/70 to-transparent"
      />
      <figure className="m-10 max-w-md rounded-lg border border-line bg-glass p-6 shadow-raise-strong backdrop-blur-md xl:m-14">
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
