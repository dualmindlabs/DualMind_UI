import { motion } from 'motion/react';
import { useContext } from 'react';

import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { useLeaderboard } from '@/features/leaderboard';
import { ApiClientContext } from '@/hooks/use-api-client';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import type { LiveAnswer } from '../lib/battle-machine';

function LiveRating({ answer, side }: { answer: LiveAnswer; side?: 'a' | 'b' }) {
  const board = useLeaderboard();
  const reduce = useShouldReduceMotion();
  const model = answer.model;
  if (!model || !board.data) return null;
  const entry = board.data.entries.find(
    candidate =>
      candidate.modelName === model.name || (model.id !== null && candidate.id === model.id),
  );
  if (!entry) return null;
  // Where the model sits between the board's lowest and highest rating (a 6% floor keeps a
  // last-place bar visible).
  const ratings = board.data.entries.map(candidate => candidate.elo);
  const low = Math.min(...ratings);
  const high = Math.max(...ratings);
  const fill = high > low ? Math.min(1, Math.max(0.06, (entry.elo - low) / (high - low))) : 1;

  return (
    <p
      data-testid="model-rating"
      className="flex flex-wrap items-baseline gap-x-2 gap-y-1.5 font-mono text-caption whitespace-nowrap text-fg-soft"
    >
      <span>Rating</span>
      <span className="text-ui font-semibold text-fg">
        <NumberTicker
          value={entry.elo}
          startValue={entry.elo - 90}
          grouping={false}
          stiffness={70}
          damping={26}
          delay={0.9}
        />
      </span>
      {entry.rank === null ? (
        <span>not yet rated</span>
      ) : (
        <span>
          rank <span className="text-fg">{entry.rank}</span>
        </span>
      )}
      {side ? (
        <span
          aria-hidden="true"
          className="bg-line-subtle mt-1 block h-1.5 w-full basis-full overflow-hidden rounded-full"
        >
          <motion.span
            data-testid="rating-bar"
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: fill }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.9 }}
            className={cn(
              'block h-full origin-left rounded-full',
              side === 'a' ? 'bg-mind-a' : 'bg-mind-b',
            )}
          />
        </span>
      ) : null}
    </p>
  );
}

/**
 * The model's standing on the public board, counting up when the names appear: its rating and
 * rank, as the leaderboard shows them now (the vote has not been folded in yet, so no delta is
 * claimed). Renders nothing without the API or when the board does not list the model.
 */
export function ModelRating({
  answer,
  side,
}: {
  answer: LiveAnswer | null;
  /** Draws the rating bar in this side's colour. */
  side?: 'a' | 'b';
}) {
  const api = useContext(ApiClientContext);
  if (!api || !answer) return null;
  return <LiveRating answer={answer} {...(side ? { side } : {})} />;
}
