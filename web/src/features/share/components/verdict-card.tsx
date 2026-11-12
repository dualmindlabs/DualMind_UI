import { Lock, Scale } from 'lucide-react';
import { useMemo } from 'react';

import { ModelMark } from '@/components/ui/model-mark';
import { formatDuration, toTurns, type TurnData, VOTE_LABELS } from '@/features/arena';
import { displayNameFromModelName, type SharedThread } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

type Side = 'a' | 'b';

function nameOf(modelName: string | null, names: ReadonlyMap<string, string>): string {
  if (!modelName) return 'Unnamed model';
  return names.get(modelName) ?? displayNameFromModelName(modelName);
}

function Contender({
  side,
  name,
  timeMs,
  hidden,
  picked,
}: {
  side: Side;
  name: string;
  timeMs: number | null;
  hidden: boolean;
  picked: boolean;
}) {
  const time = formatDuration(timeMs);
  return (
    <div
      data-contender={side}
      className={cn(
        'grid content-start gap-3 p-4',
        side === 'a' ? 'surface-a' : 'surface-b',
        picked && (side === 'a' ? 'glow-a' : 'glow-b'),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <ModelMark name={hidden ? side.toUpperCase() : name} who={side} size="md" />
        {picked ? (
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-caption font-medium',
              side === 'a'
                ? 'border-mind-a-edge bg-mind-a-tint text-mind-a'
                : 'border-mind-b-edge bg-mind-b-tint text-mind-b-text',
            )}
          >
            Picked
          </span>
        ) : null}
      </div>
      <div className="grid gap-1">
        <p className="eyebrow text-muted">Answer {side.toUpperCase()}</p>
        {hidden ? (
          <p className="flex items-center gap-1.5 text-ui font-medium text-fg-soft">
            <Lock aria-hidden="true" className="size-3.5" strokeWidth={2} />
            Hidden
          </p>
        ) : (
          <p className="text-ui font-semibold text-balance break-words text-fg">{name}</p>
        )}
        {time && !hidden ? <p className="numeric text-caption text-muted">{time}</p> : null}
      </div>
    </div>
  );
}

function outcomeOf(turn: TurnData): { text: string; side: Side | null } {
  if (!turn.revealed) return { text: 'No verdict yet', side: null };
  if (!turn.vote) return { text: 'No vote', side: null };
  return {
    text: VOTE_LABELS[turn.vote],
    side: turn.vote === 'left' ? 'a' : turn.vote === 'right' ? 'b' : null,
  };
}

/**
 * The verdict, as a card: the prompt, the two contenders (named once there is a vote, otherwise
 * "Hidden") and the outcome. Built from the first two-answer turn of the thread; it is the page's
 * picture of the battle, the one people screenshot. A Direct chat has no contest, so no card.
 */
export function VerdictCard({
  shared,
  names,
}: {
  shared: SharedThread;
  names: ReadonlyMap<string, string>;
}) {
  const turns = useMemo(
    () =>
      toTurns(
        shared.messages,
        shared.thread.mode === 'battle'
          ? 'battle'
          : shared.thread.mode === 'arena'
            ? 'side'
            : 'direct',
      ),
    [shared],
  );
  const turn = turns.find(candidate => candidate.b !== null);
  if (!turn?.b || shared.thread.mode === 'direct') return null;

  const outcome = outcomeOf(turn);
  const hidden = !turn.revealed;
  const more = turns.length - 1;

  return (
    <section
      aria-label="Verdict at a glance"
      data-testid="share-verdict-card"
      className="relative isolate grid gap-5 overflow-hidden surface-float p-5 sm:p-6"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 mesh-duel opacity-70" />
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow text-muted">DualMind Arena</span>
        <span className="eyebrow text-fg-soft">{hidden ? 'Blind battle' : 'Verdict'}</span>
      </div>
      <p className="line-clamp-3 text-h3 text-balance break-words text-fg">{turn.prompt}</p>
      <div className="grid grid-cols-2 gap-3">
        <Contender
          side="a"
          name={nameOf(turn.a.modelName, names)}
          timeMs={turn.a.timeMs}
          hidden={hidden}
          picked={outcome.side === 'a'}
        />
        <Contender
          side="b"
          name={nameOf(turn.b.modelName, names)}
          timeMs={turn.b.timeMs}
          hidden={hidden}
          picked={outcome.side === 'b'}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-4">
        <p className="flex items-center gap-2 text-ui text-fg">
          <Scale aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
          <span className="text-muted">Outcome</span>
          <span
            className={cn(
              'font-semibold',
              outcome.side === 'a' && 'text-mind-a',
              outcome.side === 'b' && 'text-mind-b-text',
            )}
          >
            {outcome.text}
          </span>
        </p>
        {more > 0 ? (
          <p className="text-caption text-muted">
            First of {turns.length} turns, the rest are below
          </p>
        ) : null}
      </div>
    </section>
  );
}
