import { motion } from 'motion/react';
import { type ReactNode, useContext, useMemo } from 'react';

import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { eloShare, useLeaderboard } from '@/features/leaderboard';
import { ApiClientContext } from '@/hooks/use-api-client';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import type { VoteChoice } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import type { LiveAnswer } from '../lib/battle-machine';
import { projectElo, whyItMatters } from '../lib/elo';

/** One model's standing on the board and where this vote would take it. */
export interface Standing {
  before: number;
  after: number;
  delta: number;
  rank: number | null;
  /** Bar positions, 0 to 1 on the board's own scale. */
  beforeShare: number;
  afterShare: number;
}

export interface Ratings {
  a: Standing | null;
  b: Standing | null;
  why: string | null;
}

function Loaded({
  turn,
  children,
}: {
  turn: { a: LiveAnswer | null; b: LiveAnswer | null; vote: VoteChoice | null };
  children: (ratings: Ratings) => ReactNode;
}) {
  const board = useLeaderboard();
  const ratings = useMemo<Ratings>(() => {
    const entries = board.data?.entries ?? [];
    const find = (answer: LiveAnswer | null) => {
      const model = answer?.model;
      if (!model) return undefined;
      return entries.find(
        candidate =>
          candidate.modelName === model.name || (model.id !== null && candidate.id === model.id),
      );
    };
    const a = find(turn.a);
    const b = find(turn.b);
    if (!a || !b || !turn.vote) return { a: null, b: null, why: null };
    const elos = entries.map(entry => entry.elo);
    const lowest = Math.min(...elos);
    const highest = Math.max(...elos);
    const move = projectElo(a.elo, b.elo, turn.vote);
    const standing = (entry: NonNullable<typeof a>, delta: number): Standing => ({
      before: entry.elo,
      after: entry.elo + delta,
      delta,
      rank: entry.rank,
      beforeShare: eloShare(entry.elo, lowest, highest),
      afterShare: eloShare(entry.elo + delta, lowest, highest),
    });
    return { a: standing(a, move.a), b: standing(b, move.b), why: whyItMatters(move) };
  }, [board.data, turn.a, turn.b, turn.vote]);
  return <>{children(ratings)}</>;
}

/**
 * Hands the two models' standings to its children: from the leaderboard the arena already loads,
 * with the movement this vote would cause. Without the API (design pages, tests) or when the board
 * does not list both models, the standings are null and the reveal shows names alone.
 */
export function RatingsGate({
  turn,
  children,
}: {
  turn: { a: LiveAnswer | null; b: LiveAnswer | null; vote: VoteChoice | null };
  children: (ratings: Ratings) => ReactNode;
}) {
  const api = useContext(ApiClientContext);
  if (!api) return <>{children({ a: null, b: null, why: null })}</>;
  return <Loaded turn={turn}>{children}</Loaded>;
}

/**
 * A rating bar: the model's place on the board's scale, with a tick where it stood before the vote
 * and a fill that slides to where it lands (transform only), the rating counting with it and the
 * movement beside it. It reads as one sentence for screen readers. Reduced motion: it is simply
 * at the end.
 */
export function RatingBar({ side, standing }: { side: 'a' | 'b'; standing: Standing }) {
  const reduce = useShouldReduceMotion();
  const moved = standing.delta !== 0;
  const sign = standing.delta > 0 ? '+' : '−';
  const start = standing.afterShare > 0 ? standing.beforeShare / standing.afterShare : 1;
  return (
    <div data-testid="model-rating" className="grid gap-1.5">
      <div className="flex items-baseline gap-x-2 font-mono text-caption whitespace-nowrap text-fg-soft tabular-nums">
        <span>Rating</span>
        <span className="text-ui font-semibold text-fg">
          <NumberTicker
            value={standing.after}
            startValue={standing.before}
            grouping={false}
            stiffness={60}
            damping={24}
            delay={0.7}
          />
        </span>
        {moved ? (
          <span
            data-testid="rating-delta"
            className={cn('font-medium', standing.delta > 0 ? 'text-ok' : 'text-bad')}
          >
            <span aria-hidden="true">
              {sign}
              {Math.abs(standing.delta)}
            </span>
            <span className="sr-only">
              {standing.delta > 0 ? 'up' : 'down'} {Math.abs(standing.delta)}, projected
            </span>
          </span>
        ) : (
          <span className="text-muted">no change</span>
        )}
        {standing.rank === null ? (
          <span className="ml-auto">not yet rated</span>
        ) : (
          <span className="ml-auto">
            rank <span className="text-fg">{standing.rank}</span>
          </span>
        )}
      </div>
      <div aria-hidden="true" className="relative h-2 overflow-hidden rounded-full bg-line/70">
        <motion.span
          initial={reduce ? false : { scaleX: start }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: `${standing.afterShare * 100}%` }}
          className={cn(
            'absolute inset-y-0 left-0 origin-left rounded-full',
            side === 'a' ? 'bg-mind-a' : 'bg-mind-b',
          )}
        />
        {moved ? (
          <span
            className="absolute inset-y-0 w-0.5 bg-fg/70"
            style={{ left: `calc(${standing.beforeShare * 100}% - 1px)` }}
          />
        ) : null}
      </div>
    </div>
  );
}
