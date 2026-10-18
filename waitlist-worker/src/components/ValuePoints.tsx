import type { ComponentType, CSSProperties, SVGProps } from 'react';
import SpotlightCard from './reactbits/SpotlightCard';
import { OpenData, Rating, TwoMinds } from './icons';
import { SectionHeading } from './SectionHeading';

interface Point {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
  tag: string;
  glow: string;
}

// Every claim here matches the public docs (docs.dualmindlab.tech).
const POINTS: Point[] = [
  {
    Icon: TwoMinds,
    title: 'Blind battles',
    body: 'Two anonymous models answer the same prompt. You judge the words, not the logo: the names appear only after you vote.',
    tag: 'Model A  ·  Model B',
    glow: 'rgb(0 217 255 / 0.9)',
  },
  {
    Icon: Rating,
    title: 'Your vote is the benchmark',
    body: 'Pick A, B, a tie or both bad. Each vote updates ELO ratings that weigh who a model beat, so one lucky win doesn’t crown a champion.',
    tag: 'ELO · the chess rating system',
    glow: 'rgb(167 139 250 / 0.9)',
  },
  {
    Icon: OpenData,
    title: 'A public leaderboard',
    body: 'The rankings and the API behind them are public. Read the leaderboard, or query it yourself, without an account.',
    tag: 'GET /api/arena/model-stats',
    glow: 'rgb(203 146 117 / 0.9)',
  },
];

export function ValuePoints() {
  return (
    <section id="how" aria-labelledby="how-title" className="mx-auto max-w-[1200px] scroll-mt-8 px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading
        id="how-title"
        index="01"
        label="Why it exists"
        lede="Static benchmarks leak into training data and stop telling models apart. Blind, side-by-side votes from people asking real questions hold up longer."
      >
        Benchmarks are broken. <span className="human">Human judgment isn’t.</span>
      </SectionHeading>

      <ul className="mt-14 grid gap-4 md:grid-cols-3">
        {POINTS.map(({ Icon, title, body, tag, glow }, index) => (
          <li key={title} className="flex">
            <SpotlightCard
              spotlightColor={glow}
              intensity={0.12}
              spotlightSize={320}
              borderGlow={0.7}
              className="flex w-full flex-col rounded-[22px] p-6 sm:p-7"
              style={{ '--spotlight-card-surface': '#13161C', '--spotlight-card-border': 'rgb(255 255 255 / 0.07)' } as CSSProperties}
            >
              <div className="flex items-center justify-between">
                <Icon className="size-9" />
                <span className="font-mono text-[11px] tracking-[0.2em] text-muted">0{index + 1}</span>
              </div>
              <h3 className="mt-10 text-[22px] leading-tight font-medium tracking-[-0.02em] text-fg">{title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-fg-soft">{body}</p>
              <p className="mt-8 border-t border-line-soft pt-4 font-mono text-[11px] tracking-[0.12em] text-muted">{tag}</p>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
