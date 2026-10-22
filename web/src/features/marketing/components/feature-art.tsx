import { ArrowLeftRight, Lock } from 'lucide-react';

import { ModelMark } from '@/components/ui/model-mark';
import { RoleBadge } from '@/components/ui/role-badge';
import { EloBar, formatElo } from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

import type { Feature } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { battleAt } from '../lib/demo-machine';
import { exampleModels } from '../lib/example-models';

const BATTLE = battleAt(1);
const SNIPPET = BATTLE.crispSide === 'a' ? BATTLE.crisp : BATTLE.padded;

const VOTE_CHOICES = ['A is better', 'Tie', 'Both are bad', 'B is better'] as const;

/** Blind by design: two answers whose names are held back, and the label the reveal brings. */
function BlindArt() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['a', 'b'] as const).map(side => (
        <div
          key={side}
          className={cn(
            'flex min-w-0 flex-col gap-2.5 p-3.5',
            side === 'a' ? 'surface-a' : 'surface-b',
          )}
        >
          <span className="flex items-center gap-2">
            <RoleBadge who={side} letterOnly size="sm" />
            <span className="text-ui-sm font-medium text-fg">Answer {side.toUpperCase()}</span>
          </span>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-bg-deep px-2.5 py-1 text-caption text-fg-soft">
            <Lock className="size-3" strokeWidth={2} />
            <span className="h-2 w-16 rounded-full bg-[repeating-linear-gradient(135deg,var(--line-strong)_0_3px,transparent_3px_6px)]" />
          </span>
          <span className="line-clamp-4 text-ui-sm text-fg-soft">
            {side === 'a' ? BATTLE.padded : SNIPPET}
          </span>
        </div>
      ))}
      <p className="col-span-2 flex items-center justify-center gap-2 text-caption text-muted">
        <span className="h-px w-8 bg-line-strong" />
        Names appear after your vote
        <span className="h-px w-8 bg-line-strong" />
      </p>
    </div>
  );
}

/** Fair pairings: the same two models, on opposite sides in the next battle. */
function PairingsArt({ stats }: { stats: LiveStatsState }) {
  const [first, second] = exampleModels(stats);
  const rows = [
    { label: 'Battle 1', a: first, b: second },
    { label: 'Battle 2', a: second, b: first },
    { label: 'Battle 3', a: first, b: second },
  ];
  return (
    <div className="grid gap-2.5">
      {rows.map(row => (
        <div
          key={row.label}
          className="grid grid-cols-[3.5rem_minmax(0,1fr)_1rem_minmax(0,1fr)] items-center gap-2 rounded-lg border border-line bg-surface-2 p-2 shadow-raise"
        >
          <span className="eyebrow text-muted">{row.label}</span>
          <span className="flex min-w-0 items-center gap-2 rounded-md bg-mind-a-tint p-1.5">
            <ModelMark name={row.a.name} who="a" size="sm" />
            <span className="truncate text-caption font-medium text-fg">{row.a.name}</span>
          </span>
          <ArrowLeftRight aria-hidden="true" className="size-3.5 text-muted" strokeWidth={2} />
          <span className="flex min-w-0 items-center gap-2 rounded-md bg-mind-b-tint p-1.5">
            <ModelMark name={row.b.name} who="b" size="sm" />
            <span className="truncate text-caption font-medium text-fg">{row.b.name}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** Live ratings: the top of the real board, or quiet placeholders until it answers. */
function RatingsArt({ stats }: { stats: LiveStatsState }) {
  const top = stats.status === 'ready' ? stats.stats.top.slice(0, 4) : [];
  if (top.length === 0) {
    return (
      <div className="grid gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map(row => (
          <span key={row} className="h-9 rounded-md bg-surface-2" />
        ))}
      </div>
    );
  }
  return (
    <ul className="grid gap-2.5">
      {top.map(model => (
        <li
          key={model.id}
          className="grid grid-cols-[1.5rem_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 shadow-raise"
        >
          <span className="numeric text-caption text-muted">{model.rank}</span>
          <span className="truncate text-ui-sm font-medium text-fg">{model.name}</span>
          <span className="text-right numeric text-ui-sm text-fg">{formatElo(model.elo)}</span>
          <EloBar
            share={model.eloShare}
            tone={model.rank === 1 ? 'lead' : 'default'}
            className="col-span-3 col-start-1"
          />
        </li>
      ))}
    </ul>
  );
}

/** Open methodology: the formula and the four vote choices, as the how-it-works page writes them. */
function MethodArt() {
  return (
    <div className="grid gap-3">
      <div className="surface-inset px-4 py-3.5">
        <p className="eyebrow text-muted">Expected score</p>
        <p className="mt-2 font-mono text-ui text-fg sm:text-body">
          E(A) = 1 / (1 + 10<sup className="text-caption">(Rb − Ra) / 400</sup>)
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {VOTE_CHOICES.map(choice => (
          <span
            key={choice}
            className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-caption font-medium text-fg-soft"
          >
            {choice}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The picture at the top of each feature card, made of the product's own pieces: panes with held
 * back names, the same pair on opposite sides, the live top of the board, the formula. The card's
 * title and text carry the meaning; the picture is hidden from assistive technology.
 */
export function FeatureArt({ id, stats }: { id: Feature['id']; stats: LiveStatsState }) {
  return (
    <div aria-hidden="true">
      {id === 'blind' ? <BlindArt /> : null}
      {id === 'pairings' ? <PairingsArt stats={stats} /> : null}
      {id === 'ratings' ? <RatingsArt stats={stats} /> : null}
      {id === 'method' ? <MethodArt /> : null}
    </div>
  );
}
