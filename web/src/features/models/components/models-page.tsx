import { SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BoardEmpty,
  BoardError,
  BoardStatus,
  ModelDetails,
  SortToggle,
  useBoardView,
  useLeaderboard,
  useModelCommands,
  useModelDetails,
} from '@/features/leaderboard';
import { useApiClient } from '@/hooks/use-api-client';
import { cn } from '@/lib/utils/cn';

import { togglePinned } from '../lib/compare';
import { CompareDock } from './compare-dock';
import { ModelCard, type ModelLayout, ModelListHead } from './model-card';
import { ModelsControls } from './models-controls';
import { ModelsHero } from './models-hero';

const GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';
const LIST = 'grid gap-2';

function ListSkeleton({ layout }: { layout: ModelLayout }) {
  return (
    <ul aria-hidden="true" className={layout === 'cards' ? GRID : LIST}>
      {Array.from({ length: layout === 'cards' ? 6 : 8 }, (_, index) => (
        <li
          key={index}
          className={cn(
            'surface-duel',
            layout === 'cards' ? 'grid h-72 content-between p-5' : 'flex items-center gap-4 p-4',
          )}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
          {layout === 'cards' ? (
            <>
              <div className="grid gap-2">
                <Skeleton className="h-6 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            <Skeleton className="ml-auto h-4 w-1/3" />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Filters that match nothing: what was searched for, a way back, and what usually works. */
function NoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const trimmed = query.trim();
  return (
    <div className="surface-duel grid justify-items-center gap-5 mesh-duel px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-lg border border-line-strong bg-surface-2 text-fg-soft shadow-raise"
      >
        <SearchX strokeWidth={1.5} className="size-6" />
      </span>
      <div className="grid max-w-reading gap-2">
        <h3 className="text-h3 font-semibold text-fg">
          {trimmed ? `No model matches “${trimmed}”.` : 'No model matches these filters.'}
        </h3>
        <p className="text-ui text-fg-soft">
          Try part of a name, such as “llama” or “gemma”, or another maker.
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear the filters
      </Button>
    </div>
  );
}

/**
 * /models/: every model in the Arena, from the same live model-stats data as the leaderboard (it
 * replaces a static article about older model generations). A masthead with live numbers, search,
 * maker chips, a cards or list view, three orders, a head-to-head comparison of any two pinned
 * models, and the shared details sheet.
 */
export function ModelsPage() {
  const query = useLeaderboard();
  const { isMock } = useApiClient();
  const board = query.data;
  const view = useBoardView(board?.entries);
  const details = useModelDetails();
  useModelCommands(board?.entries, details.openModel);
  const [layout, setLayout] = useState<ModelLayout>('cards');
  const [pinned, setPinned] = useState<string[]>([]);

  const failed = board === undefined && query.isError;
  const leaderElo = board?.rated[0]?.elo ?? board?.summary.topElo ?? 0;
  const pinnedModels = useMemo(
    () =>
      pinned.flatMap(id => {
        const entry = board?.entries.find(item => item.id === id);
        return entry ? [entry] : [];
      }),
    [pinned, board],
  );

  function list() {
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
            Loading the models
          </p>
          <noscript>
            <p className="mb-4 rounded-md border border-line bg-surface px-4 py-3 text-ui text-fg-soft">
              The model list loads live from the Arena API in your browser. Turn on JavaScript to
              see it.
            </p>
          </noscript>
          <ListSkeleton layout={layout} />
        </div>
      );
    }
    if (board.entries.length === 0) return <BoardEmpty />;
    if (view.visible.length === 0) {
      return <NoMatch query={view.filters.query} onClear={view.clearFilters} />;
    }
    return (
      <div className="grid gap-2">
        {layout === 'list' ? <ModelListHead /> : null}
      <ul aria-label="Models" className={layout === 'cards' ? GRID : LIST}>
        {view.visible.map(entry => {
          const slot = pinned.indexOf(entry.id);
          return (
            <ModelCard
              key={entry.id}
              entry={entry}
              leaderElo={leaderElo}
              layout={layout}
              pinSlot={slot === 0 ? 0 : slot === 1 ? 1 : null}
              onOpen={details.openModel}
              onTogglePin={id => setPinned(current => togglePinned(current, id))}
            />
          );
        })}
      </ul>
      </div>
    );
  }

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <ModelsHero summary={board?.summary} />

        <section
          aria-labelledby="directory-title"
          className={cn('py-10 md:py-14', pinned.length > 0 && 'pb-52 sm:pb-44')}
        >
          <PageContainer className="grid gap-6">
            <h2 id="directory-title" className="sr-only">
              Model directory
            </h2>
            <ModelsControls
              filters={view.filters}
              onFiltersChange={view.setFilters}
              providers={board?.providers ?? []}
              total={board?.summary.models ?? 0}
              layout={layout}
              onLayoutChange={setLayout}
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
                <SortToggle
                  sort={view.sort}
                  onSortChange={view.setSort}
                  options={['rank', 'name', 'winRate', 'battles']}
                  labels={{ name: 'A to Z' }}
                />
              </div>
            ) : null}
            {list()}
          </PageContainer>
        </section>
      </main>
      <SiteFooter />
      <CompareDock
        models={pinnedModels}
        onClear={() => setPinned([])}
        onUnpin={id => setPinned(current => current.filter(item => item !== id))}
      />
      <ModelDetails
        board={board}
        selectedId={details.selectedId}
        open={details.open}
        onOpenChange={details.onOpenChange}
        returnFocusRef={details.returnFocusRef}
        from="models"
      />
    </>
  );
}
