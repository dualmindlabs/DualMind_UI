import { Gauge, Scale, Swords } from 'lucide-react';

import { BentoGrid, BentoGridItem } from '@/components/vendor/aceternity/bento-grid';
import { GlowingEffect } from '@/components/vendor/aceternity/glowing-effect';
import { SpotlightCard } from '@/components/vendor/reactbits/spotlight-card';

import { EffectDemoModeSwitch } from './effect-demo-mode-switch';
import { EffectFrame } from './effect-frame';
import { MindBadge } from './mind-badge';

const iconClass = 'size-5 text-mind-a';

/** Decorative header art for the bento cards, drawn from the tokens. */
const blindArt = (
  <div aria-hidden="true" className="grid h-full min-h-16 grid-cols-2 gap-2">
    {(['a', 'b'] as const).map(side => (
      <div
        key={side}
        className="flex flex-col gap-1.5 rounded-md border border-line bg-surface-2 p-2.5"
      >
        <MindBadge side={side} className="size-5 text-caption" />
        <span className="h-1.5 w-4/5 rounded-full bg-line" />
        <span className="h-1.5 w-3/5 rounded-full bg-line" />
      </div>
    ))}
  </div>
);

const pairingArt = (
  <svg
    aria-hidden="true"
    viewBox="0 0 120 120"
    className="mx-auto h-full max-h-56 min-h-24 w-auto"
    fill="none"
  >
    <g className="stroke-line-strong" strokeWidth="0.75" strokeOpacity="0.7">
      {[0, 1, 2, 3, 4, 5].flatMap(a =>
        [0, 1, 2, 3, 4, 5]
          .filter(b => b > a)
          .map(b => {
            const angle = (i: number) => (i / 6) * Math.PI * 2 - Math.PI / 2;
            return (
              <line
                key={`${a}-${b}`}
                x1={60 + 44 * Math.cos(angle(a))}
                y1={60 + 44 * Math.sin(angle(a))}
                x2={60 + 44 * Math.cos(angle(b))}
                y2={60 + 44 * Math.sin(angle(b))}
              />
            );
          }),
      )}
    </g>
    {[0, 1, 2, 3, 4, 5].map(i => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return (
        <circle
          key={i}
          cx={60 + 44 * Math.cos(angle)}
          cy={60 + 44 * Math.sin(angle)}
          r="5"
          className={i % 2 === 0 ? 'fill-mind-a' : 'fill-mind-b'}
        />
      );
    })}
  </svg>
);

const ratingArt = (
  <svg
    aria-hidden="true"
    viewBox="0 0 240 60"
    preserveAspectRatio="none"
    className="h-full min-h-16 w-full"
    fill="none"
  >
    <path
      d="M0 48 L30 44 L60 46 L90 34 L120 38 L150 24 L180 28 L210 14 L240 10 V60 H0 Z"
      className="fill-mind-a-tint"
    />
    <path
      d="M0 48 L30 44 L60 46 L90 34 L120 38 L150 24 L180 28 L210 14 L240 10"
      className="stroke-mind-a"
      strokeWidth="2"
      vectorEffect="non-scaling-stroke"
      strokeLinejoin="round"
    />
  </svg>
);

const features = [
  {
    title: 'Blind by design',
    description: 'Names stay hidden until you vote.',
    icon: <Swords aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
    header: blindArt,
    className: 'md:col-span-2',
  },
  {
    title: 'Fair pairings',
    description: 'Every model meets every other one.',
    icon: <Scale aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
    header: pairingArt,
    className: 'md:row-span-2',
  },
  {
    title: 'Live ratings',
    description: 'Elo moves with every vote.',
    icon: <Gauge aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
    header: ratingArt,
    className: 'md:col-span-2',
  },
];

/** Spotlight Card, Glowing Effect, Bento Grid and Animated Background. */
export function EffectsSurfaces() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <EffectFrame effect="spotlight-card">
        <SpotlightCard className="w-full max-w-xs p-5">
          <p className="eyebrow text-muted">Model</p>
          <p className="mt-2 text-h3 font-semibold text-fg">Vega 7</p>
          <p className="mt-1 font-mono text-caption text-muted tabular-nums">Elo 1342 · rank 1</p>
          <a
            href="#effects"
            className="mt-4 inline-flex rounded-sm text-ui-sm font-medium text-mind-a underline-offset-4 hover:underline"
          >
            View model details
          </a>
        </SpotlightCard>
      </EffectFrame>

      <EffectFrame effect="glowing-effect">
        <div className="relative w-full max-w-xs rounded-lg border border-line bg-surface-2 p-5 shadow-raise">
          <GlowingEffect spread={40} proximity={64} inactiveZone={0.01} borderWidth={2} />
          <Swords aria-hidden="true" className="size-5 text-mind-a" strokeWidth={1.75} />
          <p className="mt-3 text-ui font-semibold text-fg">Blind by design</p>
          <p className="mt-1 text-ui-sm text-fg-soft">Move the pointer around the card.</p>
        </div>
      </EffectFrame>

      <EffectDemoModeSwitch />

      <EffectFrame
        effect="bento-grid"
        className="sm:col-span-2 xl:col-span-3"
        stageClassName="items-stretch"
      >
        <BentoGrid className="w-full md:auto-rows-[12.5rem]">
          {features.map(feature => (
            <BentoGridItem
              key={feature.title}
              titleAs="p"
              title={feature.title}
              description={feature.description}
              className={feature.className}
              icon={feature.icon}
              header={<div className="min-h-0 flex-1">{feature.header}</div>}
            >
              <GlowingEffect spread={36} proximity={48} inactiveZone={0.01} borderWidth={1} />
            </BentoGridItem>
          ))}
        </BentoGrid>
      </EffectFrame>
    </div>
  );
}
