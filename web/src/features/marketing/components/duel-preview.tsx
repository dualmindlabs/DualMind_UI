import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import { REVEAL_LABELS } from '../content/demo';
import { battleAt } from '../lib/demo-machine';

type Stage = 'vote' | 'picked' | 'reveal';

/** The battle the picture shows: answer A is the padded one, B the one that answers (crispSide). */
const BATTLE = battleAt(0);
const ANSWERS = {
  a: BATTLE.crispSide === 'a' ? BATTLE.crisp : BATTLE.padded,
  b: BATTLE.crispSide === 'b' ? BATTLE.crisp : BATTLE.padded,
} as const;
const LABELS = {
  a: BATTLE.crispSide === 'a' ? REVEAL_LABELS.crisp : REVEAL_LABELS.padded,
  b: BATTLE.crispSide === 'b' ? REVEAL_LABELS.crisp : REVEAL_LABELS.padded,
} as const;
const VOTES = ['A is better', 'Tie', 'Both are bad', 'B is better'] as const;

/**
 * The hero's product picture: a live duel in the arena's own pieces (prompt, two answer panes, the
 * verdict row, the reveal). It plays once, in under five seconds, then rests on the reveal: the
 * vote lands on B, the names unmask, B takes the winner's glow. Under reduced motion it shows the
 * revealed state at once. The answers are the recorded demo's, written for illustration. The whole
 * picture is decorative and hidden from assistive technology; the playable demo below is the real
 * thing.
 */
export function DuelPreview({ className }: { className?: string }) {
  const reduce = useShouldReduceMotion();
  const [stage, setStage] = useState<Stage>('vote');

  useEffect(() => {
    if (reduce) {
      setStage('reveal');
      return undefined;
    }
    const picked = window.setTimeout(() => setStage('picked'), 1900);
    const reveal = window.setTimeout(() => setStage('reveal'), 2800);
    return () => {
      window.clearTimeout(picked);
      window.clearTimeout(reveal);
    };
  }, [reduce]);

  const picked = stage !== 'vote';
  const revealed = stage === 'reveal';

  return (
    <div
      aria-hidden="true"
      data-testid="duel-preview"
      data-stage={stage}
      className={cn('relative w-full', className)}
    >
      <div className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(closest-side_at_22%_40%,color-mix(in_oklab,var(--mind-a)_20%,transparent),transparent_75%),radial-gradient(closest-side_at_80%_62%,color-mix(in_oklab,var(--mind-b)_18%,transparent),transparent_75%)]" />
      <div className="grid gap-3 surface-float p-3 sm:gap-4 sm:p-4">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="flex items-center gap-2 eyebrow text-fg-soft">
            <span className="flex gap-1">
              <span className="size-2 rounded-full bg-mind-a" />
              <span className="size-2 rounded-full bg-mind-b" />
            </span>
            Battle
          </p>
          <p className="relative h-4 w-28 text-right eyebrow text-muted">
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-end gap-1.5 transition-opacity duration-(--dur-base)',
                revealed && 'opacity-0',
              )}
            >
              <Lock className="size-3" strokeWidth={2} />
              Names hidden
            </span>
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-end text-human transition-opacity duration-(--dur-base)',
                !revealed && 'opacity-0',
              )}
            >
              Revealed
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3 py-2.5 shadow-raise">
          <RoleBadge who="human" letterOnly />
          <p className="min-w-0 truncate text-ui font-medium text-fg">{BATTLE.prompt}</p>
        </div>

        <div className="relative grid grid-cols-2 gap-3">
          {(['a', 'b'] as const).map(side => {
            const won = revealed && side === 'b';
            return (
              <div
                key={side}
                className={cn(
                  'flex min-w-0 flex-col gap-2.5 p-3 transition-shadow duration-(--dur-slow) ease-out-expo sm:p-3.5',
                  side === 'a' ? 'surface-a' : 'surface-b',
                  won && 'glow-b',
                )}
              >
                <div className="flex min-h-6 items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <RoleBadge who={side} letterOnly size="sm" />
                    <span className="text-ui-sm font-medium text-fg">
                      Answer {side.toUpperCase()}
                    </span>
                  </span>
                </div>
                <p className="relative h-4 text-caption text-muted">
                  <span
                    className={cn(
                      'absolute inset-0 truncate transition-opacity duration-(--dur-base)',
                      revealed && 'opacity-0',
                    )}
                  >
                    Name hidden until you vote
                  </span>
                  <span
                    className={cn(
                      'absolute inset-0 truncate text-fg transition-[opacity,transform] duration-(--dur-slow) ease-out-expo',
                      !revealed && 'translate-y-1 opacity-0',
                    )}
                  >
                    {LABELS[side]}
                  </span>
                </p>
                <p className="line-clamp-6 text-caption text-fg-soft sm:line-clamp-7 sm:text-ui-sm">
                  {ANSWERS[side]}
                </p>
                {won ? (
                  <span className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-human/50 bg-human-tint px-2.5 py-1 eyebrow text-human">
                    Your pick
                  </span>
                ) : null}
              </div>
            );
          })}
          <span className="absolute top-1/2 left-1/2 z-10 grid size-9 -translate-1/2 place-items-center rounded-full border border-line-strong bg-surface-2 font-mono text-label font-medium text-fg shadow-float">
            VS
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-line bg-bg-deep p-1.5">
          {VOTES.map(label => {
            const isPick = label === 'B is better';
            return (
              <span
                key={label}
                className={cn(
                  'grid h-9 place-items-center rounded-md border px-1 text-center text-label font-medium transition-[background-color,color,border-color,transform] duration-(--dur-fast) ease-out-expo sm:text-caption',
                  isPick && picked
                    ? 'scale-[1.03] border-mind-b-text bg-mind-b-text text-on-accent'
                    : 'border-transparent bg-surface text-fg-soft',
                )}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
