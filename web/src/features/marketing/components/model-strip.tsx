import { useState } from 'react';

import { type LogoItem, LogoLoop } from '@/components/vendor/reactbits/logo-loop';
import { modelMaker, resolveDisplayName } from '@/lib/models/display-name';

import { MODEL_SNAPSHOT, MODEL_SNAPSHOT_DATE } from '../content/model-snapshot';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { PauseButton } from './pause-button';

const STRIP_SIZE = 24;

/**
 * "In the arena now": the models of the live leaderboard as text wordmarks (no third-party logo
 * images), looping slowly. It starts from a dated snapshot so the prerendered page is complete and
 * swaps in the live list when the API answers. Stops on hover, on keyboard focus, off-screen and
 * under reduced motion, and has a visible pause button.
 */
export function ModelStrip({ stats }: { stats: LiveStatsState }) {
  const [paused, setPaused] = useState(false);
  const live = stats.status === 'ready';
  const models = live
    ? stats.stats.ranked.slice(0, STRIP_SIZE).map(model => ({
        name: model.name,
        maker: model.providerLabel,
      }))
    : MODEL_SNAPSHOT.map(model => ({
        name: resolveDisplayName(model.name),
        maker: modelMaker(model.name, model.providerId).label,
      }));

  const logos: LogoItem[] = models.map(model => ({
    label: `${model.name}, ${model.maker}`,
    node: (
      <span className="inline-flex items-baseline gap-2.5 whitespace-nowrap">
        <span className="font-mono text-ui-sm text-fg-soft">{model.name}</span>
        <span className="eyebrow text-muted">{model.maker}</span>
      </span>
    ),
  }));

  return (
    <section aria-labelledby="models-title" className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-page flex-col gap-3 px-4 py-5 sm:px-6 md:flex-row md:items-center md:gap-8">
        <div className="flex shrink-0 items-center justify-between gap-4 md:w-52 md:flex-col md:items-start md:gap-1.5">
          <h2 id="models-title" className="eyebrow text-fg-soft">
            In the arena now
          </h2>
          <p className="font-mono text-caption text-muted" data-testid="model-strip-source">
            {live ? `Live · ${stats.stats.models} models` : `List as of ${MODEL_SNAPSHOT_DATE}`}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <LogoLoop
            logos={logos}
            ariaLabel="Models in the arena"
            speed={32}
            gap={40}
            logoHeight={32}
            paused={paused}
            className="min-w-0 flex-1"
          />
          <PauseButton
            paused={paused}
            onToggle={() => setPaused(value => !value)}
            subject="the model list"
          />
        </div>
      </div>
    </section>
  );
}
