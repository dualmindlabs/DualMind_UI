import { Swords } from 'lucide-react';
import { useContext, useId } from 'react';

import { Button } from '@/components/ui/button';
import { ApiClientContext } from '@/hooks/use-api-client';
import { type CrossExamineStats, VOTE_CHOICES, type VoteChoice } from '@/lib/api';

import { useArena } from '../hooks/use-arena';
import { useCrossExamineStats } from '../hooks/use-cross-examine-stats';
import type { LiveTurn } from '../lib/battle-machine';
import { VOTE_LABELS } from '../lib/turns';

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** What the second vote did, in a sentence, with the crowd's number once there are enough rounds. */
function Outcome({ turn, stats }: { turn: LiveTurn; stats: CrossExamineStats }) {
  const second = turn.crossExamine.round2Choice;
  if (second === null) return null;
  const { flipRate, rounds } = stats.overall;
  return (
    <p data-testid="cross-examine-outcome" className="text-ui-sm text-fg-soft">
      {turn.crossExamine.flipped
        ? `You changed your vote to "${VOTE_LABELS[second]}".`
        : `You kept your vote: "${VOTE_LABELS[second]}".`}
      {flipRate !== null && rounds >= 20
        ? ` Across ${rounds.toLocaleString('en-US')} cross-examined battles, ${percent(flipRate)} of voters changed their vote.`
        : ''}
    </p>
  );
}

/**
 * Cross-examine (backend PR 71, flag `cross_examine`), after a vote: ask both models to rebut
 * each other (the rebuttals appear under the answers), then optionally vote again. The first vote
 * is the one that counts for the board; the second is kept apart, and the strip says so. Rendered
 * only when the backend reports cross-examine on and the first vote is saved, so with the flag off
 * the reveal is exactly what it was.
 */
function CrossExamineStrip({ turn, stats }: { turn: LiveTurn; stats: CrossExamineStats }) {
  const { battle } = useArena();
  const titleId = useId();
  const state = turn.crossExamine;
  const asking = state.critique === 'loading';
  const voting = state.round2 === 'voting';

  return (
    <section
      aria-labelledby={titleId}
      data-testid="cross-examine"
      className="grid w-full gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 text-start"
    >
      <div className="grid gap-1">
        <h3
          id={titleId}
          className="inline-flex items-center gap-2 font-mono text-label tracking-[0.1em] text-fg-soft uppercase"
        >
          <Swords aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          Cross-examine
        </h3>
        <p className="text-ui-sm text-fg-soft">
          {state.critique === 'ready'
            ? 'Each model has answered the other. Read the replies under the answers above.'
            : 'Let each model answer the other in under 80 words. Your first vote has already counted.'}
        </p>
      </div>

      {state.critique === 'idle' || state.critique === 'loading' || state.critique === 'failed' ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            loading={asking}
            onClick={() => battle.critique(turn.id)}
          >
            {state.critique === 'failed' ? 'Try the critique again' : 'Ask for the critique'}
          </Button>
          {asking ? (
            <p role="status" className="text-ui-sm text-fg-soft">
              Both models are writing. This takes a few seconds.
            </p>
          ) : null}
        </div>
      ) : null}

      {state.critique === 'failed' && state.critiqueMessage ? (
        <p role="alert" data-testid="critique-error" className="text-ui-sm text-bad">
          {state.critiqueMessage}
        </p>
      ) : null}

      {state.critique === 'ready' ? (
        state.round2 === 'done' ? (
          <Outcome turn={turn} stats={stats} />
        ) : (
          <div
            role="group"
            aria-label="Vote again, optional"
            className="grid gap-2"
            data-testid="second-vote"
          >
            <p className="text-ui-sm text-fg-soft">
              Vote again if the replies changed your mind. It is optional, and it is kept apart from
              your first vote.
            </p>
            <div className="flex flex-wrap gap-2">
              {VOTE_CHOICES.map((choice: VoteChoice) => (
                <Button
                  key={choice}
                  variant="ghost"
                  size="sm"
                  className="border border-line"
                  disabled={voting && state.round2Choice !== choice}
                  loading={voting && state.round2Choice === choice}
                  onClick={() => battle.secondVote(turn.id, choice)}
                >
                  {VOTE_LABELS[choice]}
                </Button>
              ))}
            </div>
            {state.round2 === 'failed' && state.round2Message ? (
              <p role="alert" data-testid="second-vote-error" className="text-ui-sm text-bad">
                {state.round2Message}
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </section>
  );
}

function Probed({ turn }: { turn: LiveTurn }) {
  const stats = useCrossExamineStats(true);
  return stats ? <CrossExamineStrip turn={turn} stats={stats} /> : null;
}

/**
 * The strip's place in the reveal. It needs the first vote saved on the server (a vote still in
 * the offline queue is not there to cross-examine), an API to ask, and the backend to say
 * cross-examine is on; until all three hold, nothing about it is on screen.
 */
export function CrossExamineSlot({ turn }: { turn: LiveTurn }) {
  const api = useContext(ApiClientContext);
  if (!api || turn.comparisonId === null || turn.votePending) return null;
  return <Probed turn={turn} />;
}
