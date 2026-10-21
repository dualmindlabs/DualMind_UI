import { EyeOff } from 'lucide-react';

import { RoleBadge } from '@/components/ui/role-badge';

import type { Feature } from '../content/landing';

const NODES = [0, 1, 2, 3, 4, 5];
const angle = (index: number) => (index / NODES.length) * Math.PI * 2 - Math.PI / 2;
const point = (index: number, radius = 44) => ({
  x: 60 + radius * Math.cos(angle(index)),
  y: 60 + radius * Math.sin(angle(index)),
});

/**
 * The decorative header of each feature card, drawn from the tokens (no images). The card's title
 * and text carry the meaning; the art is hidden from assistive technology.
 */
export function FeatureArt({ id }: { id: Feature['id'] }) {
  if (id === 'blind') {
    return (
      <div aria-hidden="true" className="relative grid h-full min-h-28 grid-cols-2 gap-3">
        {(['a', 'b'] as const).map(side => (
          <div
            key={side}
            className="flex flex-col gap-2.5 rounded-md border border-line bg-surface-2 p-3"
          >
            <div className="flex items-center gap-2">
              <RoleBadge who={side} letterOnly size="sm" />
              <span className="h-2.5 w-20 rounded-full bg-[repeating-linear-gradient(135deg,var(--line-strong)_0_3px,transparent_3px_6px)] opacity-70" />
            </div>
            <span className="h-1.5 w-11/12 rounded-full bg-line" />
            <span className="h-1.5 w-4/5 rounded-full bg-line" />
            <span className="h-1.5 w-3/5 rounded-full bg-line" />
          </div>
        ))}
        <span className="absolute top-1/2 left-1/2 inline-flex -translate-1/2 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-caption text-fg-soft shadow-raise">
          <EyeOff className="size-3.5" strokeWidth={1.75} />
          Names hidden
        </span>
      </div>
    );
  }

  if (id === 'pairings') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        className="mx-auto h-full max-h-72 min-h-28 w-auto"
        fill="none"
      >
        <g className="stroke-line-strong" strokeWidth="0.6" strokeOpacity="0.75">
          {NODES.flatMap(a =>
            NODES.filter(b => b > a).map(b => {
              const from = point(a);
              const to = point(b);
              return <line key={`${a}-${b}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
            }),
          )}
        </g>
        <circle cx="60" cy="60" r="11" className="fill-human-tint stroke-human" strokeWidth="1" />
        <circle cx="60" cy="60" r="2.5" className="fill-human" />
        {NODES.map(index => {
          const { x, y } = point(index);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="5"
              className={index % 2 === 0 ? 'fill-mind-a' : 'fill-mind-b'}
            />
          );
        })}
      </svg>
    );
  }

  if (id === 'ratings') {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 240 80"
        preserveAspectRatio="none"
        className="h-full min-h-20 w-full"
        fill="none"
      >
        <path
          d="M0 62 L24 58 L48 60 L72 48 L96 52 L120 38 L144 42 L168 28 L192 31 L216 18 L240 14 V80 H0 Z"
          className="fill-mind-a-tint"
        />
        <path
          d="M0 62 L24 58 L48 60 L72 48 L96 52 L120 38 L144 42 L168 28 L192 31 L216 18 L240 14"
          className="stroke-mind-a"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        <path
          d="M0 40 L24 44 L48 41 L72 50 L96 47 L120 55 L144 52 L168 60 L192 57 L216 64 L240 66"
          className="stroke-mind-b"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex h-full min-h-20 flex-col justify-center gap-2 rounded-md border border-line bg-surface-2 px-4 py-3"
    >
      <span className="eyebrow text-muted">Expected score</span>
      <span className="font-mono text-ui-sm whitespace-nowrap text-fg">
        E(A) = 1 / (1 + 10
        <sup>
          (R<sub>B</sub> − R<sub>A</sub>) / 400
        </sup>
        )
      </span>
      <span className="font-mono text-caption text-muted">R′ = R + K × (S − E)</span>
    </div>
  );
}
