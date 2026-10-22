import { useContext } from 'react';

import { NumberTicker } from '@/components/vendor/magicui/number-ticker';
import { useLeaderboard } from '@/features/leaderboard';
import { ApiClientContext } from '@/hooks/use-api-client';

import type { LiveAnswer } from '../lib/battle-machine';

function LiveRating({ answer }: { answer: LiveAnswer }) {
  const board = useLeaderboard();
  const model = answer.model;
  if (!model || !board.data) return null;
  const entry = board.data.entries.find(
    candidate =>
      candidate.modelName === model.name || (model.id !== null && candidate.id === model.id),
  );
  if (!entry) return null;

  return (
    <p
      data-testid="model-rating"
      className="flex items-baseline gap-2 font-mono text-caption text-fg-soft"
    >
      <span>Arena rating</span>
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
