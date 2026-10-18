import { useEffect, useState, type CSSProperties } from 'react';
import type { ArenaStatsState } from '@/lib/arena-stats';
import { useReducedMotion } from '@/lib/media';
import BlurText from './reactbits/BlurText';
import { BattlePreview } from './BattlePreview';
import { HeroBackdrop } from './HeroBackdrop';
import { LiveStrip } from './LiveStrip';
import { SignupForm } from './SignupForm';

const REF_NOTES: Record<string, string> = {
  arena: 'That Arena link brings you here until launch.',
};

const LINES = [
  { text: 'Two models.', at: 0 },
  { text: 'One prompt.', at: 240 },
  { text: 'You decide.', at: 560, human: true },
] as const;

/** Each headline line blurs in a beat after the one before it. */
function Headline() {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const timers = LINES.slice(1).map((line, index) =>
      window.setTimeout(() => setShown(count => Math.max(count, index + 2)), reduced ? 0 : line.at),
    );
    return () => timers.forEach(id => window.clearTimeout(id));
  }, [reduced]);

  return (
    <h1
      id="hero-title"
      className="hero-title mt-7 text-[clamp(3rem,9vw,6.5rem)] leading-[0.95] font-light tracking-[-0.045em] text-fg"
    >
      {LINES.map((line, index) => {
        const className = 'human' in line ? 'human pr-[0.08em]' : '';
        return index < shown ? (
          <BlurText
            key={line.text}
            as="span"
            text={line.text}
            animateBy="words"
            trigger="load"
            delay={90}
            blur={12}
            distance={26}
            stepDuration={0.42}
            className={className}
          />
        ) : (
          <span key={line.text} className={`blur-text hero-pending flex opacity-0 ${className}`}>
            {line.text}
          </span>
        );
      })}
    </h1>
  );
}

export function Hero({ refCode, stats }: { refCode: string | null; stats: ArenaStatsState }) {
  const note = refCode ? REF_NOTES[refCode] : undefined;

  return (
    <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
      <HeroBackdrop />
      <div className="mx-auto max-w-[1200px] px-4 pt-28 pb-20 sm:px-8 sm:pt-40 sm:pb-28 lg:pt-44 xl:grid xl:grid-cols-[minmax(0,1fr)_440px] xl:items-center xl:gap-14">
        <div>
          <p className="eyebrow rise flex items-center gap-2.5">
            <span className="live-dot" aria-hidden="true" />
            DualMind Arena · Early access
          </p>

          <Headline />

          <p
            className="rise mt-8 max-w-[44ch] text-[16px] leading-relaxed text-fg-soft sm:text-lg"
            style={{ '--rise-delay': '180ms' } as CSSProperties}
          >
            DualMind Arena runs blind battles between AI models. Read two anonymous answers to the same prompt, vote
            for the better one, then see who wrote them. Every vote moves a public ELO leaderboard.
          </p>

          {note && (
            <p
              className="rise mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 font-mono text-[11px] tracking-[0.06em] text-fg-soft"
              data-testid="ref-note"
            >
              <span className="size-1.5 rounded-full bg-violet-text" aria-hidden="true" />
              {note}
            </p>
          )}

          <div className="rise mt-9" style={{ '--rise-delay': '280ms' } as CSSProperties}>
            <SignupForm refCode={refCode} />
          </div>

          <div className="rise mt-7" style={{ '--rise-delay': '380ms' } as CSSProperties}>
            <LiveStrip stats={stats} />
          </div>
        </div>

        <div className="rise" style={{ '--rise-delay': '450ms' } as CSSProperties}>
          <BattlePreview />
        </div>
      </div>
    </section>
  );
}
