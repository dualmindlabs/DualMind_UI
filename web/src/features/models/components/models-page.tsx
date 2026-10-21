import { ArrowRight, Swords } from 'lucide-react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ARENA_HREF,
  BoardControls,
  BoardEmpty,
  BoardError,
  BoardNoMatch,
  BoardStatus,
  ModelDetails,
  PROVISIONAL_BATTLES,
  SortToggle,
  useBoardView,
  useLeaderboard,
  useModelCommands,
  useModelDetails,
} from '@/features/leaderboard';
import { useApiClient } from '@/hooks/use-api-client';
import { cn } from '@/lib/utils/cn';

import { ModelCard } from './model-card';

const GRID = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function GridSkeleton() {
  return (
    <ul aria-hidden="true" className={GRID}>
      {Array.from({ length: 8 }, (_, index) => (
        <li
          key={index}
          className="grid h-56 content-between rounded-lg border border-line bg-surface p-5 shadow-raise"
        >
          <div className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
          <Skeleton className="h-10 w-full" />
        </li>
      ))}
    </ul>
  );
}

/**
 * /models/: every model in the Arena as a card grid, from the same live model-stats data as the
 * leaderboard (it replaces a static article about older model generations). Search, provider
 * filter, three orders, and the shared details sheet.
 */
export function ModelsPage() {
  const query = useLeaderboard();
  const { isMock } = useApiClient();
  const board = query.data;
  const view = useBoardView(board?.entries);
  const details = useModelDetails();
  useModelCommands(board?.entries, details.openModel);

  const failed = board === undefined && query.isError;

  function grid() {
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
          <GridSkeleton />
        </div>
      );
    }
    if (board.entries.length === 0) return <BoardEmpty />;
    if (view.visible.length === 0) {
      return <BoardNoMatch query={view.filters.query} onClear={view.clearFilters} />;
    }
    return (
      <ul aria-label="Models" className={GRID}>
        {view.visible.map(entry => (
          <ModelCard key={entry.id} entry={entry} onOpen={details.openModel} />
        ))}
      </ul>
    );
  }

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <header className="relative isolate overflow-hidden border-b border-line bg-bg-deep">
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 dot-grid [mask-image:radial-gradient(ellipse_70%_80%_at_70%_0%,black,transparent)] opacity-60"
          />
          <PageContainer className="grid max-w-page gap-6 pt-14 pb-12 md:pt-20 md:pb-16">
            <p className="flex items-center gap-3">
              <span className="eyebrow text-muted">Models</span>
              <span aria-hidden="true" className="h-px w-8 bg-line-strong" />
              <span className="eyebrow text-muted">Live from the Arena</span>
            </p>
            <h1 className="max-w-3xl text-h1 font-medium text-fg">
              Every model in <span className="human-voice text-human">the Arena.</span>
            </h1>
            <p className="max-w-reading text-body text-fg-soft">
              The models that answer blind battles, with their current Elo rating, win rate and
              number of battles. Models with fewer than {PROVISIONAL_BATTLES} battles have no rank
              yet and are marked as not yet rated. Select one to see its record against the rest of the board.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a href={ARENA_HREF} className={cn(buttonVariants({ variant: 'primary' }))}>
                <Swords aria-hidden="true" strokeWidth={1.75} />
                Start a battle
              </a>
              <a href="/leaderboard/" className={cn(buttonVariants({ variant: 'ghost' }))}>
                Open the leaderboard
                <ArrowRight aria-hidden="true" strokeWidth={1.75} />
              </a>
            </div>
          </PageContainer>
        </header>

        <section aria-labelledby="directory-title" className="py-12 md:py-16">
          <PageContainer className="grid gap-6">
            <h2 id="directory-title" className="sr-only">
              Model directory
            </h2>
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
                <SortToggle
                  sort={view.sort}
                  onSortChange={view.setSort}
                  options={['rank', 'name', 'battles']}
                  labels={{ name: 'A to Z' }}
                />
              </div>
            ) : null}
            {grid()}
          </PageContainer>
        </section>
      </main>
      <SiteFooter />
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
