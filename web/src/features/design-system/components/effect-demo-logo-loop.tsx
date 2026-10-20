import { useState } from 'react';

import { type LogoItem, LogoLoop } from '@/components/vendor/reactbits/logo-loop';

import { EffectFrame } from './effect-frame';
import { PauseToggle } from './pause-toggle';

/** Fictional providers for the style guide: a geometric mark and a word, in currentColor. */
function mark(label: string, shape: 'circle' | 'triangle' | 'square' | 'hexagon' | 'diamond') {
  const paths = {
    circle: <circle cx="12" cy="12" r="8" />,
    triangle: <path d="M12 4 L20 19 H4 Z" />,
    square: <rect x="5" y="5" width="14" height="14" rx="3" />,
    hexagon: <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" />,
    diamond: <path d="M12 3 L21 12 L12 21 L3 12 Z" />,
  };
  const node = (
    <span className="inline-flex items-center gap-2 text-ui font-semibold tracking-tight">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 fill-none stroke-current"
        strokeWidth="1.75"
      >
        {paths[shape]}
      </svg>
      <span aria-hidden="true">{label}</span>
    </span>
  );
  return { label, node } satisfies LogoItem;
}

const providers: LogoItem[] = [
  mark('Northwind', 'circle'),
  mark('Vega Labs', 'triangle'),
  mark('Lumen', 'square'),
  mark('Halcyon', 'hexagon'),
  mark('Parallax', 'diamond'),
];

/** Logo Loop: the model providers strip, with a visible pause control (WCAG 2.2.2). */
export function EffectDemoLogoLoop() {
  const [paused, setPaused] = useState(false);

  return (
    <EffectFrame effect="logo-loop" stageClassName="flex-col gap-4 px-0">
      <LogoLoop
        logos={providers}
        ariaLabel="Model providers"
        speed={36}
        gap={40}
        paused={paused}
        className="w-full"
      />
      <PauseToggle paused={paused} onToggle={() => setPaused(value => !value)} label="logos" />
    </EffectFrame>
  );
}
