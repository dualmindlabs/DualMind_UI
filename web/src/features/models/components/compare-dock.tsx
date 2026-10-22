import { Swords, X } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { ModelMark } from '@/components/ui/model-mark';
import {
  ARENA_HREF,
  formatElo,
  formatEloDelta,
  type LeaderboardEntry,
} from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

import { chancePercent, headToHead } from '../lib/compare';

export interface CompareDockProps {
  /** The pinned models: the first is Mind A, the second Mind B. */
  models: readonly LeaderboardEntry[];
  onClear: () => void;
  onUnpin: (id: string) => void;
}

function Side({
  entry,
  who,
  chance,
  onUnpin,
}: {
  entry: LeaderboardEntry | undefined;
  who: 'a' | 'b';
  chance?: number | undefined;
  onUnpin: (id: string) => void;
}) {
  const align = who === 'b' ? 'sm:flex-row-reverse sm:text-right' : '';
  if (!entry) {
    return (
      <div className={cn('flex min-w-0 items-center gap-3', align)}>
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-md border border-dashed border-line-strong font-mono text-ui-sm text-muted"
        >
          {who === 'a' ? 'A' : 'B'}
        </span>
        <p className="text-ui-sm text-muted">Pick a second model to compare.</p>
      </div>
    );
  }
  return (
    <div className={cn('flex min-w-0 items-center gap-3', align)}>
      <ModelMark name={entry.providerLabel} who={who} />
      <div className="grid min-w-0">
        <p className="min-w-0 text-ui font-semibold break-words text-fg">{entry.name}</p>
        <p className="font-mono text-caption text-muted tabular-nums">
          {formatElo(entry.elo)} Elo
          {chance === undefined ? '' : ` · ${chancePercent(chance)}% to win`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${entry.name} from the comparison`}
        onClick={() => onUnpin(entry.id)}
        className="shrink-0"
      >
        <X aria-hidden="true" strokeWidth={1.75} />
      </Button>
    </div>
  );
}

/**
 * A dock at the bottom of the screen once a model is pinned. With two it forecasts the matchup
 * from their Elo (the chance each wins one battle), as a split bar in the Mind A / Mind B
 * colours with the numbers written out, so colour is never the only signal.
 */
export function CompareDock({ models, onClear, onUnpin }: CompareDockProps) {
  const [first, second] = models;
  if (!first) return null;
  const result = second ? headToHead(first.elo, second.elo) : undefined;
  const pa = result ? chancePercent(result.first) : 50;
  const pb = result ? 100 - pa : 50;

  let summary = 'Pick a second model to compare.';
  if (result && second) {
    summary =
      result.gap === 0
        ? `${first.name} and ${second.name} are level on Elo: an even matchup.`
        : `${result.gap > 0 ? first.name : second.name} is expected to win ${Math.max(pa, pb)}% of battles, a gap of ${Math.abs(Math.round(result.gap))} Elo.`;
  }

  return (
    <section
      aria-label="Model comparison"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="surface-float pointer-events-auto mx-auto grid max-w-4xl animate-rise gap-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
          <Side entry={first} who="a" chance={result?.first} onUnpin={onUnpin} />
          <span
            aria-hidden="true"
            className="hidden place-items-center font-mono text-label tracking-[0.2em] text-muted uppercase sm:grid"
          >
            vs
          </span>
          <Side entry={second} who="b" chance={result?.second} onUnpin={onUnpin} />
        </div>

        <div className="grid gap-2">
          <div
            aria-hidden="true"
            className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-line"
          >
            <span
              className="bg-mind-a transition-[flex-grow] duration-(--dur-slow) ease-out-expo"
              style={{ flexGrow: pa, flexBasis: 0 }}
            />
            <span
              className="bg-mind-b transition-[flex-grow] duration-(--dur-slow) ease-out-expo"
              style={{ flexGrow: second ? pb : 0, flexBasis: 0 }}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p role="status" className="min-w-0 text-ui-sm text-fg-soft">
              {summary}
              {result && second && result.gap !== 0 ? (
                <span className="sr-only">
                  {' '}
                  {first.name} {formatEloDelta(result.gap)} Elo against {second.name}.
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClear}>
                Clear comparison
              </Button>
              {second ? (
                <a href={ARENA_HREF} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
                  <Swords aria-hidden="true" strokeWidth={1.75} />
                  Judge your own
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
