import { useMemo } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { SectionTitle } from '@/components/ui/section-title';
import { useApiClient } from '@/hooks/use-api-client';

import { useBoardView } from '../hooks/use-board-view';
import { useLeaderboard } from '../hooks/use-leaderboard';
import { TABLE_QUERY, useMediaQuery } from '../hooks/use-media-query';
import { useModelCommands } from '../hooks/use-model-commands';
import { useModelDetails } from '../hooks/use-model-details';
import { useRankMovement } from '../hooks/use-rank-movement';
import { rangeDomain } from '../lib/confidence';
import { PROVISIONAL_BATTLES, RATINGS_HELP_HREF } from '../lib/constants';
import { isRated } from '../lib/entries';
import { hasActiveFilters } from '../lib/filter';
import { BoardCardList } from './board-card-list';
import { BoardControls } from './board-controls';
import { BoardEmpty, BoardError, BoardNoMatch, BoardSkeleton } from './board-state';
import { BoardStatus } from './board-status';
import { LeaderboardHero } from './leaderboard-hero';
import { LeaderboardTable } from './leaderboard-table';
import { Methodology } from './methodology';
import { ModelDetails } from './model-details';
import { Podium } from './podium';
import { SortToggle } from './sort-toggle';
import { UnratedGroup } from './unrated-group';

/** Elo values count up from the board's lowest round hundred (900 for a board starting at 909). */
function eloStartFor(bottomElo: number): number {
  return Math.max(0, Math.floor(bottomElo / 100) * 100);
}

/**
 * /leaderboard/: the live board from the public model-stats API, no sign-in. The header,
 * methodology and loading skeletons are prerendered; the numbers load in the browser and refresh
 * every minute. Podium, sortable table (a card list on phones), search, provider filter and a
 * details sheet per model.
 */
export function LeaderboardPage() {
  const query = useLeaderboard();
  const { isMock } = useApiClient();
  const board = query.data;
  const view = useBoardView(board?.entries);
  const details = useModelDetails();
  const wide = useMediaQuery(TABLE_QUERY);
  useModelCommands(board?.entries, details.openModel);
  const movement = useRankMovement(board?.rated);
  const domain = useMemo(() => rangeDomain(board?.rated ?? []), [board?.rated]);

  const leaderId = board?.rated[0]?.id;
  const loading = board === undefined && query.isPending;
  const failed = board === undefined && query.isError;

  function rankings() {
    if (failed) {
      return (
        <BoardError
          error={query.error}
          retrying={query.isFetching}
          onRetry={() => void query.refetch()}
        />
      );
    }
    if (board === undefined || view.visible === undefined) {
      return (
        <div aria-busy="true">
          <p role="status" className="sr-only">
            Loading the leaderboard
          </p>
          <noscript>
            <p className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-ui text-fg-soft">
              The rankings load live from the Arena API in your browser. Turn on JavaScript to see
              them, or read <a href={RATINGS_HELP_HREF}>how ratings work</a>.
            </p>
          </noscript>
          <BoardSkeleton />
        </div>
      );
    }
    if (board.entries.length === 0) return <BoardEmpty />;
    if (view.visible.length === 0) {
      return <BoardNoMatch query={view.filters.query} onClear={view.clearFilters} />;
    }
    const rated = view.visible.filter(isRated);
    const unrated = view.visible.filter(entry => !isRated(entry));
    return (
      <div className="grid gap-8">
        {rated.length === 0 ? (
          <p className="rounded-md border border-line bg-surface px-4 py-3 text-ui text-fg-soft">
            No rated model matches. The matches below are not yet rated.
          </p>
        ) : wide ? (
          <LeaderboardTable
            entries={rated}
            sort={view.sort}
            onSort={view.toggleSort}
            onOpen={details.openModel}
            leaderId={leaderId}
            domain={domain}
            movement={movement}
          />
        ) : (
          <BoardCardList
            entries={rated}
            onOpen={details.openModel}
            leaderId={leaderId}
            domain={domain}
            movement={movement}
          />
        )}
        {unrated.length > 0 ? (
          <UnratedGroup
            entries={unrated}
            forceOpen={hasActiveFilters(view.filters)}
            wide={wide}
            sort={view.sort}
            onSort={view.toggleSort}
            onOpen={details.openModel}
            domain={domain}
          />
        ) : null}
      </div>
    );
  }

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <LeaderboardHero
          summary={board?.summary}
          updatedAt={query.dataUpdatedAt}
          refreshing={query.isFetching && !loading}
          stale={query.isRefetchError}
        />

        {failed || board?.rated.length === 0 ? null : (
          <section aria-labelledby="podium-title" className="pt-12 md:pt-20">
            <PageContainer className="grid gap-8">
              <SectionTitle
                id="podium-title"
                level="h2"
                kicker="Top three"
                title="The models to beat"
              />
              <Podium
                entries={board?.rated}
                eloStart={board ? eloStartFor(board.summary.bottomElo) : 0}
                domain={domain}
                movement={movement}
                onOpen={details.openModel}
              />
            </PageContainer>
          </section>
        )}

        <section id="rankings" aria-labelledby="rankings-title" className="py-14 md:py-20">
          <PageContainer className="grid gap-6">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <SectionTitle
                id="rankings-title"
                kicker="The full board"
                title="Full rankings"
                lead="Sort any column, search by name or model id, or narrow to one provider. Select a model for its record, rating range and rivals."
              />
              <p className="flex items-center gap-2 text-caption text-muted">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-warn" />
                Fewer than {PROVISIONAL_BATTLES} battles: listed as not yet rated, without a rank
              </p>
            </div>

            <BoardControls
              filters={view.filters}
              onFiltersChange={view.setFilters}
              providers={board?.providers ?? []}
              total={board?.summary.models ?? 0}
              disabled={board === undefined}
            />

            {board !== undefined && view.visible !== undefined && board.entries.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <BoardStatus
                  shown={view.visible.length}
                  total={board.entries.length}
                  updatedAt={query.dataUpdatedAt}
                  refreshing={query.isFetching}
                  refreshError={query.isRefetchError ? query.error : null}
                  onRefresh={() => void query.refetch()}
                  isMock={isMock}
                  className="w-full"
                />
                {wide ? null : <SortToggle sort={view.sort} onSortChange={view.setSort} />}
              </div>
            ) : null}

            {rankings()}
          </PageContainer>
        </section>

        <Methodology />
      </main>
      <SiteFooter />
      <ModelDetails
        board={board}
        selectedId={details.selectedId}
        open={details.open}
        onOpenChange={details.onOpenChange}
        returnFocusRef={details.returnFocusRef}
        from="leaderboard"
        movement={movement}
      />
    </>
  );
}
