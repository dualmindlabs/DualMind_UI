import { Check, Plus } from 'lucide-react';
import { useRef } from 'react';

import { ModelMark } from '@/components/ui/model-mark';
import {
  EloBar,
  formatCount,
  formatElo,
  formatEloDelta,
  formatPercent,
  formatRank,
  type LeaderboardEntry,
  UnratedBadge,
} from '@/features/leaderboard';
import { cn } from '@/lib/utils/cn';

export type ModelLayout = 'cards' | 'list';

export interface ModelCardProps {
  entry: LeaderboardEntry;
  /** The top rating on the board, for the "vs #1" gap. */
  leaderElo: number;
  layout?: ModelLayout;
  /** 0 for the first pinned model (Mind A), 1 for the second (Mind B), null when not pinned. */
  pinSlot: 0 | 1 | null;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  onTogglePin: (id: string) => void;
}

/** The stretched-link button: the whole card opens the details, the name is its accessible name. */
const OPEN_BUTTON =
  'cursor-pointer text-left outline-none after:absolute after:inset-0 after:z-[2] after:rounded-[inherit] focus-visible:after:outline-(length:--focus-width) focus-visible:after:-outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid';

function Rank({ entry, className }: { entry: LeaderboardEntry; className?: string }) {
  if (entry.rank === null) return <UnratedBadge />;
  return (
    <span
      className={cn(
        'numeric tabular-nums',
        entry.rank === 1 ? 'text-mind-a' : entry.rank <= 3 ? 'text-fg' : 'text-muted',
        className,
      )}
    >
      <span className="sr-only">Rank </span>#{formatRank(entry.rank)}
    </span>
  );
}

function gapLabel(entry: LeaderboardEntry, leaderElo: number): string {
  if (entry.rank === 1) return 'Leads the board';
  if (entry.provisional) return 'Rating still settling';
  return `${formatEloDelta(entry.elo - leaderElo)} vs #1`;
}

/** A win / tie / loss split of the model's record; decorative, the numbers are written beside it. */
function RecordBar({ entry }: { entry: LeaderboardEntry }) {
  const total = Math.max(1, entry.wins + entry.ties + entry.losses);
  return (
    <span
      aria-hidden="true"
      className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-line"
    >
      <span className="bg-ok" style={{ flexGrow: entry.wins / total, flexBasis: 0 }} />
      <span className="bg-fg/30" style={{ flexGrow: entry.ties / total, flexBasis: 0 }} />
      <span className="bg-bad/80" style={{ flexGrow: entry.losses / total, flexBasis: 0 }} />
    </span>
  );
}

/**
 * The compare control: a real checkbox (so it never collides with the name button), drawn as a
 * pill above the stretched link. Its name is "Compare <model>".
 */
function CompareToggle({
  entry,
  pinSlot,
  onTogglePin,
  className,
}: Pick<ModelCardProps, 'entry' | 'pinSlot' | 'onTogglePin'> & { className?: string }) {
  const pinned = pinSlot !== null;
  return (
    <label
      className={cn(
        'group/pin relative z-[3] inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-ui-sm font-medium transition-[background-color,border-color,color] duration-(--dur-fast) select-none hit-area',
        'has-focus-visible:outline-(length:--focus-width) has-focus-visible:outline-offset-2 has-focus-visible:outline-focus has-focus-visible:outline-solid',
        pinSlot === 0 && 'border-mind-a/55 bg-mind-a-tint text-mind-a',
        pinSlot === 1 && 'border-mind-b/60 bg-mind-b-tint text-mind-b-text',
        !pinned && 'border-line text-fg-soft hover:border-line-strong hover:bg-hover hover:text-fg',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={pinned}
        onChange={() => onTogglePin(entry.id)}
        className="peer sr-only"
      />
      {pinned ? (
        <Check aria-hidden="true" strokeWidth={2} className="size-3.5" />
      ) : (
        <Plus aria-hidden="true" strokeWidth={2} className="size-3.5" />
      )}
      <span aria-hidden="true">
        {pinned ? (pinSlot === 0 ? 'Compare A' : 'Compare B') : 'Compare'}
      </span>
      <span className="sr-only">Compare {entry.name}</span>
    </label>
  );
}

function pinOutline(pinSlot: 0 | 1 | null): string {
  if (pinSlot === 0) return 'outline-2 -outline-offset-1 outline-mind-a outline-solid';
  if (pinSlot === 1) return 'outline-2 -outline-offset-1 outline-mind-b outline-solid';
  return '';
}

/**
 * One model in the directory. `cards`: maker mark and rank, the full readable name, its Elo at
 * display size with the gap to the leader, a win / tie / loss split, and a compare toggle. `list`:
 * the same facts in one dense row. Either way the name is the button that opens the details.
 */
export function ModelCard({
  entry,
  leaderElo,
  layout = 'cards',
  pinSlot,
  onOpen,
  onTogglePin,
}: ModelCardProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const open = () => onOpen(entry.id, buttonRef.current);

  const nameButton = (
    <button
      ref={buttonRef}
      type="button"
      aria-haspopup="dialog"
      onClick={open}
      title={entry.modelName}
      className={OPEN_BUTTON}
    >
      {entry.name}
    </button>
  );

  if (layout === 'list') {
    return (
      <li className="min-w-0" data-model-id={entry.id}>
        <div
          className={cn(
            'group/model surface-duel relative grid items-center gap-x-4 gap-y-3 px-4 py-3 transition-[border-color] duration-(--dur-fast) hover:border-line-strong',
            'grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_4.5rem_6rem_5rem_7rem_auto]',
            pinOutline(pinSlot),
          )}
        >
          <ModelMark name={entry.providerLabel} size="md" />
          <div className="grid min-w-0 gap-0.5">
            <h3 className="min-w-0 text-ui font-semibold break-words text-fg group-hover/model:underline group-hover/model:decoration-line-strong group-hover/model:underline-offset-4">
              {nameButton}
            </h3>
            <p className="min-w-0 text-caption text-muted">
              {entry.providerLabel}
              {entry.servedBy ? ` · ${entry.servedBy}` : ''}
            </p>
          </div>
          <Rank entry={entry} className="justify-self-end text-h3" />
          <dl className="col-span-3 grid grid-cols-3 gap-3 md:contents">
            <div className="grid gap-0.5 md:justify-items-end">
              <dt className="eyebrow text-muted md:sr-only">Elo</dt>
              <dd className="numeric text-ui text-fg">{formatElo(entry.elo)}</dd>
            </div>
            <div className="grid gap-0.5 md:justify-items-end">
              <dt className="eyebrow text-muted md:sr-only">Win rate</dt>
              <dd className="numeric text-ui text-fg">{formatPercent(entry.winRate)}</dd>
            </div>
            <div className="grid gap-0.5 md:justify-items-end">
              <dt className="eyebrow text-muted md:sr-only">Battles</dt>
              <dd className="numeric text-ui text-fg">{formatCount(entry.battles)}</dd>
            </div>
          </dl>
          <CompareToggle
            entry={entry}
            pinSlot={pinSlot}
            onTogglePin={onTogglePin}
            className="col-span-3 justify-self-start md:col-span-1 md:justify-self-end"
          />
        </div>
      </li>
    );
  }

  return (
    <li className="min-w-0" data-model-id={entry.id}>
      <div
        className={cn(
          'group/model hover-rise relative flex h-full flex-col gap-5 p-5 transition-[border-color] duration-(--dur-fast) hover:border-line-strong',
          entry.rank === 1 ? 'surface-a' : 'surface-duel',
          pinOutline(pinSlot),
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ModelMark name={entry.providerLabel} size="md" />
            <div className="grid min-w-0">
              <span className="text-ui-sm font-medium text-fg-soft">
                <span className="sr-only">Maker: </span>
                {entry.providerLabel}
              </span>
              {entry.servedBy ? (
                <span className="text-caption text-muted">{entry.servedBy}</span>
              ) : null}
            </div>
          </div>
          <Rank entry={entry} className="text-h3" />
        </div>

        <div className="grid min-w-0 gap-1.5">
          <h3 className="min-w-0 text-h3 font-semibold break-words text-fg group-hover/model:underline group-hover/model:decoration-line-strong group-hover/model:underline-offset-4">
            {nameButton}
          </h3>
          <p className="font-code text-caption break-all text-muted">{entry.modelName}</p>
        </div>

        <div className="mt-auto grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-end justify-between gap-3">
              <p className="flex items-baseline gap-2">
                <span className="numeric text-stat text-fg">{formatElo(entry.elo)}</span>
                <span className="eyebrow text-muted">Elo</span>
              </p>
              <p className="pb-1 font-mono text-caption text-muted tabular-nums">
                {gapLabel(entry, leaderElo)}
              </p>
            </div>
            <EloBar share={entry.eloShare} tone={entry.rank === 1 ? 'lead' : 'default'} />
          </div>

          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div className="grid gap-0.5">
              <dt className="eyebrow text-muted">Win rate</dt>
              <dd className="numeric text-ui text-fg">{formatPercent(entry.winRate)}</dd>
            </div>
            <div className="grid gap-0.5">
              <dt className="eyebrow text-muted">Battles</dt>
              <dd className="numeric text-ui text-fg">{formatCount(entry.battles)}</dd>
            </div>
          </dl>

          <div className="grid gap-1.5">
            <RecordBar entry={entry} />
            <p className="font-mono text-caption text-muted tabular-nums">
              <span className="text-ok">{formatCount(entry.wins)}W</span>
              {' · '}
              {formatCount(entry.ties)}T{' · '}
              <span className="text-bad">{formatCount(entry.losses)}L</span>
              <span className="sr-only"> wins, ties and losses</span>
            </p>
          </div>

          <CompareToggle
            entry={entry}
            pinSlot={pinSlot}
            onTogglePin={onTogglePin}
            className="justify-self-start"
          />
        </div>
      </div>
    </li>
  );
}
