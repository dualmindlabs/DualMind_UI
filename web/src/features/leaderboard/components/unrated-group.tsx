import { useState } from 'react';

import { Button } from '@/components/ui/button';

import type { RangeDomain } from '../lib/confidence';
import { PROVISIONAL_BATTLES } from '../lib/constants';
import { formatCount, pluralize } from '../lib/format';
import type { LeaderboardEntry, SortKey, SortState } from '../types';
import { BoardCardList } from './board-card-list';
import { LeaderboardTable } from './leaderboard-table';

export interface UnratedGroupProps {
  /** The models not yet rated that match the filters, sorted. */
  entries: readonly LeaderboardEntry[];
  /** True while a search or provider filter is active: the group opens by itself. */
  forceOpen: boolean;
  wide: boolean;
  sort: SortState;
  onSort: (column: SortKey) => void;
  onOpen: (id: string, trigger: HTMLElement | null) => void;
  /** The scale the range bars share. */
  domain?: RangeDomain | undefined;
}

/**
 * "Not yet rated": the models with fewer than PROVISIONAL_BATTLES battles, below the ranking and
 * collapsed by default. They have no rank number, and they never reach the podium or the landing
 * page's top five. A search or filter opens the group, so a match is never hidden in it.
 */
export function UnratedGroup({
  entries,
  forceOpen,
  wide,
  sort,
  onSort,
  onOpen,
  domain,
}: UnratedGroupProps) {
  const [open, setOpen] = useState(false);
  const expanded = open || forceOpen;
  const caption = 'Models not yet rated, without a rank. Column buttons sort the table.';

  return (
    <section aria-labelledby="unrated-title" className="grid gap-5 border-t border-line pt-10">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="grid gap-1.5">
          <h3 id="unrated-title" className="text-h3 font-semibold text-fg">
            Not yet rated
          </h3>
          <p className="max-w-reading text-ui-sm text-fg-soft">
            {pluralize(entries.length, 'model')} with fewer than {formatCount(PROVISIONAL_BATTLES)}{' '}
            battles. They have no rank yet: a few votes can still move their Elo a long way.
          </p>
        </div>
        {forceOpen ? null : (
          <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            aria-controls={open ? 'unrated-list' : undefined}
            onClick={() => setOpen(value => !value)}
          >
            {open ? 'Hide' : 'Show'} {pluralize(entries.length, 'model')}
          </Button>
        )}
      </div>
      {expanded ? (
        <div id="unrated-list">
          {wide ? (
            <LeaderboardTable
              entries={entries}
              sort={sort}
              onSort={onSort}
              onOpen={onOpen}
              showRank={false}
              domain={domain}
              caption={caption}
            />
          ) : (
            <BoardCardList
              entries={entries}
              onOpen={onOpen}
              showRank={false}
              domain={domain}
              label="Models not yet rated"
            />
          )}
        </div>
      ) : null}
    </section>
  );
}
