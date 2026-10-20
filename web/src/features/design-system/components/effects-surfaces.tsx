import { Gauge, Scale, Swords } from 'lucide-react';

import { BentoGrid, BentoGridItem } from '@/components/vendor/aceternity/bento-grid';
import { GlowingEffect } from '@/components/vendor/aceternity/glowing-effect';
import { SpotlightCard } from '@/components/vendor/reactbits/spotlight-card';

import { EffectDemoModeSwitch } from './effect-demo-mode-switch';
import { EffectFrame } from './effect-frame';

const iconClass = 'size-5 text-mind-a';

const features = [
  {
    title: 'Blind by design',
    description: 'Names stay hidden until you vote.',
    icon: <Swords aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
  },
  {
    title: 'Fair pairings',
    description: 'Every model meets every other one.',
    icon: <Scale aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
  },
  {
    title: 'Live ratings',
    description: 'Elo moves with every vote.',
    icon: <Gauge aria-hidden="true" className={iconClass} strokeWidth={1.75} />,
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
        <BentoGrid className="w-full md:auto-rows-[11rem]">
          {features.map((feature, index) => (
            <BentoGridItem
              key={feature.title}
              titleAs="p"
              title={feature.title}
              description={feature.description}
              className={index === 0 ? 'md:col-span-2' : ''}
              icon={feature.icon}
              header={
                <div
                  aria-hidden="true"
                  className="h-full min-h-12 flex-1 rounded-md bg-[radial-gradient(ellipse_at_top_left,var(--mind-a-tint),transparent_70%),radial-gradient(ellipse_at_bottom_right,var(--mind-b-tint),transparent_70%)]"
                />
              }
            >
              <GlowingEffect spread={36} proximity={48} inactiveZone={0.01} borderWidth={1} />
            </BentoGridItem>
          ))}
        </BentoGrid>
      </EffectFrame>
    </div>
  );
}
