import { ArrowUp, Check, Lock, Trophy } from 'lucide-react';

import { ModelMark } from '@/components/ui/model-mark';
import { RoleBadge } from '@/components/ui/role-badge';
import { cn } from '@/lib/utils/cn';

import { battleAt } from '../lib/demo-machine';
import type { ExampleModel } from '../lib/example-models';

const BATTLE = battleAt(0);
const PROMPT = BATTLE.prompt;
const ANSWER = {
  a: BATTLE.crispSide === 'a' ? BATTLE.crisp : BATTLE.padded,
  b: BATTLE.crispSide === 'b' ? BATTLE.crisp : BATTLE.padded,
} as const;
const VOTES = [
  { label: 'A is better', key: '1', side: 'a' },
  { label: 'Tie', key: '3', side: null },
  { label: 'Both are bad', key: '4', side: null },
  { label: 'B is better', key: '2', side: 'b' },
] as const;

const MODES = ['Battle', 'Side by side', 'Direct'] as const;

function Pane({ side, lines = 6 }: { side: 'a' | 'b'; lines?: number }) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-2.5 p-3.5',
        side === 'a' ? 'surface-a' : 'surface-b',
      )}
    >
      <span className="flex items-center gap-2">
        <RoleBadge who={side} letterOnly size="sm" />
        <span className="text-ui-sm font-medium text-fg">Answer {side.toUpperCase()}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-caption text-muted">
        <Lock className="size-3" strokeWidth={2} />
        Name hidden until you vote
      </span>
      <span
        className="text-ui-sm text-fg-soft"
        style={{
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: lines,
          overflow: 'hidden',
        }}
      >
        {ANSWER[side]}
      </span>
    </div>
  );
}

function Dock({ pick }: { pick?: 'a' | 'b' }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-line bg-bg-deep p-1.5">
      {VOTES.map(vote => {
        const isPick = vote.side !== null && vote.side === pick;
        return (
          <span
            key={vote.label}
            className={cn(
              'flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border px-1 text-center text-caption leading-tight font-medium',
              vote.side === 'a' && 'border-mind-a-edge bg-mind-a-tint text-fg',
              vote.side === 'b' && 'border-mind-b-edge bg-mind-b-tint text-fg',
              vote.side === null && 'border-line bg-surface text-fg-soft',
              isPick && vote.side === 'a' && 'border-mind-a bg-mind-a text-on-accent shadow-glow-a',
              isPick &&
                vote.side === 'b' &&
                'border-mind-b-text bg-mind-b-text text-on-accent shadow-glow-b',
            )}
          >
            <span className="truncate">{vote.label}</span>
            <span className="numeric text-label opacity-70">{vote.key}</span>
          </span>
        );
      })}
    </div>
  );
}

function AskStage() {
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <p className="text-center text-h3 font-semibold text-fg">What do you want to ask?</p>
      <div className="grid gap-3 surface-inset p-3.5">
        <p className="text-body text-fg">
          {PROMPT}
          <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-caret bg-mind-a" />
        </p>
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-wrap gap-1.5">
            {MODES.map((mode, index) => (
              <span
                key={mode}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-caption',
                  index === 0
                    ? 'border-mind-a-edge bg-mind-a-tint font-medium text-fg'
                    : 'border-line text-muted',
                )}
              >
                {mode}
              </span>
            ))}
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mind-a text-on-accent shadow-glow-a">
            <ArrowUp className="size-4" strokeWidth={2.25} />
          </span>
        </div>
      </div>
      <p className="text-center text-caption text-muted">
        Names hidden until you vote · Enter to send
      </p>
    </div>
  );
}

function CompareStage() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2">
        <RoleBadge who="human" letterOnly />
        <span className="truncate text-ui-sm font-medium text-fg">{PROMPT}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Pane side="a" lines={9} />
        <Pane side="b" lines={9} />
      </div>
    </div>
  );
}

function VoteStage() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Pane side="a" lines={4} />
        <Pane side="b" lines={4} />
      </div>
      <p className="px-1 text-ui-sm font-medium text-fg">Which answer is better?</p>
      <Dock pick="b" />
    </div>
  );
}

function RevealStage({ models }: { models: [ExampleModel, ExampleModel] }) {
  const rows = [
    { side: 'a' as const, model: models[1], won: false },
    { side: 'b' as const, model: models[0], won: true },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <p className="text-h3 font-semibold text-fg">
        B is better<span className="text-human">.</span>
      </p>
      <div className="grid gap-2.5">
        {rows.map(({ side, model, won }) => (
          <div
            key={side}
            className={cn(
              'flex items-center gap-3 p-3',
              side === 'a' ? 'surface-a' : 'surface-b',
              won && 'glow-b',
            )}
          >
            <ModelMark name={model.name} who={side} size="md" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-ui font-semibold text-fg">{model.name}</span>
              <span className="eyebrow text-muted">
                Answer {side.toUpperCase()} · {model.maker}
              </span>
            </span>
            {model.elo === null ? null : (
              <span className="numeric text-ui text-fg">{Math.round(model.elo)}</span>
            )}
            {won ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-human/50 bg-human-tint px-2 py-0.5 eyebrow text-human">
                <Check className="size-3" strokeWidth={2.5} />
                Your pick
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <p className="flex items-center gap-2 text-caption text-muted">
        <Trophy className="size-3.5 text-human" strokeWidth={2} />
        Both ratings move toward the result. Names are real models; the pairing is an example.
      </p>
    </div>
  );
}

/**
 * One stage of the how-it-works window, drawn with the arena's own pieces (composer, panes, verdict
 * row, reveal). Text comes from the recorded demo and, in the reveal, from two real models of the
 * leaderboard (ratings only when the live board answered). Decorative: the step text says what
 * happens, so the whole window is hidden from assistive technology.
 */
export function StepStage({
  step,
  models,
}: {
  step: number;
  models: [ExampleModel, ExampleModel];
}) {
  if (step === 0) return <AskStage />;
  if (step === 1) return <CompareStage />;
  if (step === 2) return <VoteStage />;
  return <RevealStage models={models} />;
}
