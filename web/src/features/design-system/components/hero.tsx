import { colorTokens, durations, easings } from '@/styles/tokens';

import { HeroEmblem } from './hero-emblem';
import { SectionNav } from './section-nav';

const stats = [
  { label: 'Colour tokens', value: String(colorTokens.length), detail: 'Dark and light values' },
  { label: 'Themes', value: '3', detail: 'System, dark, light' },
  { label: 'Contrast', value: 'AA', detail: 'WCAG 2.2, checked in CI' },
  {
    label: 'Motion',
    value: String(durations.length + easings.length),
    detail: 'Durations and easings',
  },
];

export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden border-b border-line bg-bg-deep"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 dot-grid [mask-image:radial-gradient(ellipse_70%_60%_at_70%_35%,black,transparent)]"
      />
      <div className="mx-auto grid max-w-page items-center gap-12 px-4 pt-14 pb-14 sm:px-6 md:pt-20 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:pt-24 lg:pb-20">
        <div className="min-w-0">
          <p className="animate-rise eyebrow text-muted">
            DualMind Arena <span aria-hidden="true">/</span> Design system{' '}
            <span aria-hidden="true">/</span> v0.1
          </p>
          <h1 id="hero-title" className="mt-6 animate-rise text-display [animation-delay:80ms]">
            Two minds, <span className="human-voice text-human">one verdict.</span>
          </h1>
          <p className="mt-8 max-w-reading animate-rise text-h3 font-normal text-fg-soft [animation-delay:160ms]">
            The living style guide for the Arena. Every colour, type step, control and motion token
            below is rendered from the same source the product uses, in dark and in light.
          </p>
          <SectionNav className="mt-10 animate-rise [animation-delay:240ms]" />
        </div>
        <HeroEmblem className="mx-auto hidden w-full max-w-md lg:block" />
      </div>
      <div className="border-t border-line">
        <dl className="mx-auto grid max-w-page grid-cols-2 sm:grid-cols-4">
          {stats.map(stat => (
            <div
              key={stat.label}
              className="border-line px-4 py-5 odd:border-r sm:border-r sm:px-6 sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0"
            >
              <dt className="eyebrow text-muted">{stat.label}</dt>
              <dd className="mt-2 flex items-baseline gap-2">
                <span className="text-h2 font-medium tabular-nums">{stat.value}</span>
                <span className="text-caption text-muted">{stat.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
