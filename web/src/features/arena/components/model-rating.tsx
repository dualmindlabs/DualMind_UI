import { motion } from 'motion/react';
import { useContext } from 'react';

import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { useLeaderboard } from '@/features/leaderboard';
import { ApiClientContext } from '@/hooks/use-api-client';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';

import type { LiveAnswer } from '../lib/battle-machine';

function useEntries() {
  const board = useLeaderboard();
  return board.data?.entries ?? null;
}

function findEntry(entries: NonNullable<ReturnType<typeof useEntries>>, answer: LiveAnswer | null) {
  const model = answer?.model;
  if (!model) return undefined;
  return entries.find(
    candidate =>
      candidate.modelName === model.name || (model.id !== null && candidate.id === model.id),
  );
}

function LiveRating({ answer }: { answer: LiveAnswer }) {
  const entries = useEntries();
  const entry = entries ? findEntry(entries, answer) : undefined;
  if (!entry) return null;

  return (
    <p
      data-testid="model-rating"
      className="flex flex-wrap items-baseline gap-x-2 font-mono text-caption whitespace-nowrap text-fg-soft"
    >
      <span>Rating</span>
      <span className="text-ui font-semibold text-fg">
        <NumberTicker
          value={entry.elo}
          startValue={entry.elo - 90}
          grouping={false}
          stiffness={70}
          damping={26}
          delay={0.5}
        />
      </span>
      {entry.rank === null ? (
        <span>not yet rated</span>
      ) : (
        <span>
          rank <span className="text-fg">{entry.rank}</span>
        </span>
      )}
    </p>
  );
}

/**
 * The model's standing on the public board, counting up when the names appear: its rating and
 * rank, as the leaderboard shows them now (the vote has not been folded in yet, so no delta is
 * claimed). Renders nothing without the API or when the board does not list the model.
 */
export function ModelRating({ answer }: { answer: LiveAnswer | null }) {
  const api = useContext(ApiClientContext);
  if (!api || !answer) return null;
  return <LiveRating answer={answer} />;
}

function LiveOdds({ a, b }: { a: LiveAnswer; b: LiveAnswer }) {
  const entries = useEntries();
  const reduce = useShouldReduceMotion();
  const entryA = entries ? findEntry(entries, a) : undefined;
  const entryB = entries ? findEntry(entries, b) : undefined;
  if (!entryA || !entryB) return null;
  // The standard Elo expectation: the chance that A beats B in a fresh duel.
  const share = 1 / (1 + 10 ** ((entryB.elo - entryA.elo) / 400));
  const percentA = Math.round(share * 100);
  return (
    <div data-testid="rating-odds" className="grid w-full gap-2">
      <div
        role="img"
        aria-label={`On the board, A is expected to win ${percentA} percent of duels against B, and B ${100 - percentA}`}
        className="relative h-3 overflow-hidden rounded-full bg-mind-b-text"
      >
        <motion.div
          initial={reduce ? false : { scaleX: 0.5 }}
          animate={{ scaleX: share }}
          transition={{ type: 'spring', stiffness: 60, damping: 18, delay: 0.7 }}
          className="absolute inset-0 origin-left rounded-full bg-mind-a"
        />
        <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-bg/70" />
      </div>
      <p aria-hidden="true" className="flex justify-between font-mono text-caption tabular-nums">
        <span className="text-mind-a">A {percentA}%</span>
        <span className="text-muted">expected on the board</span>
        <span className="text-mind-b-text">{100 - percentA}% B</span>
      </p>
    </div>
  );
}

/**
 * Who would win a fresh duel, from the two ratings on the public board: a tug-of-war bar in the
 * two corner colours that settles on the Elo expectation. Renders nothing without the API or when
 * the board lacks either model.
 */
export function RatingOdds({ a, b }: { a: LiveAnswer | null; b: LiveAnswer | null }) {
  const api = useContext(ApiClientContext);
  if (!api || !a || !b) return null;
  return <LiveOdds a={a} b={b} />;
}
