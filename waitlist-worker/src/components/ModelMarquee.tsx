import { useMemo } from 'react';
import { MODEL_SNAPSHOT } from '@/content/models';
import { providerLabel, type ArenaStatsState } from '@/lib/arena-stats';
import LogoLoop, { type LogoItem } from './reactbits/LogoLoop';

// One accent per provider, from the brand palette: cyan, violet and the Arena's terra.
const PROVIDER_DOT: Record<string, string> = {
  cloudflare: 'bg-cyan',
  groq: 'bg-violet-text',
  google: 'bg-terra',
};

const LEGEND = [
  ['cloudflare', 'Workers AI'],
  ['groq', 'Groq'],
  ['google', 'Google'],
] as const;

/** Every model in the Arena, scrolling past. Live from the API, with a dated snapshot as the start. */
export function ModelMarquee({ stats }: { stats: ArenaStatsState }) {
  const models = stats.status === 'ready' ? stats.data.models : MODEL_SNAPSHOT;

  const items = useMemo<LogoItem[]>(
    () =>
      models.map(model => ({
        title: `${model.name} (${providerLabel(model.provider)})`,
        ariaLabel: `${model.name}, ${providerLabel(model.provider)}`,
        node: (
          <span className="inline-flex items-center gap-2.5 font-mono text-[13px] tracking-[0.02em] text-fg-soft">
            <span className={`size-1.5 rounded-full ${PROVIDER_DOT[model.provider] ?? 'bg-muted'}`} aria-hidden="true" />
            {model.name}
          </span>
        ),
      })),
    [models],
  );

  return (
    <section aria-labelledby="models-title" className="relative border-y border-line-soft bg-ink-deep/70">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-6 sm:px-8 md:flex-row md:items-center md:gap-8">
        <div className="flex-none md:w-44">
          <h2 id="models-title" className="eyebrow">
            In the arena now
          </h2>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {models.length} models ·{' '}
            {LEGEND.map(([provider, label]) => (
              <span key={provider} className="mr-2 inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className={`size-1.5 rounded-full ${PROVIDER_DOT[provider]}`} aria-hidden="true" />
                {label}
              </span>
            ))}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <LogoLoop
            logos={items}
            speed={38}
            gap={44}
            logoHeight={22}
            pauseOnHover
            fadeOut
            fadeOutWidth={0.1}
            ariaLabel="Models in DualMind Arena"
          />
        </div>
      </div>
    </section>
  );
}
