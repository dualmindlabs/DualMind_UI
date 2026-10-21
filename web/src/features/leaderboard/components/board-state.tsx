import { CircleAlert, RotateCw, SearchX, Swords } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserMessage, isApiError } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { ARENA_HREF } from '../lib/constants';

function StateCard({
  icon,
  title,
  children,
  actions,
  tone = 'default',
  role,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: 'default' | 'error';
  role?: 'alert' | 'status';
}) {
  return (
    <div
      role={role}
      className={cn(
        'grid justify-items-start gap-4 rounded-lg border bg-surface px-6 py-8 shadow-raise sm:px-8',
        tone === 'error' ? 'border-bad/40' : 'border-line',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid size-10 place-items-center rounded-md border bg-surface-2',
          tone === 'error' ? 'border-bad/40 text-bad' : 'border-line text-fg-soft',
        )}
      >
        {icon}
      </span>
      <div className="grid max-w-reading gap-1.5">
        <h3 className="text-h3 font-medium text-fg">{title}</h3>
        <div className="text-ui text-fg-soft">{children}</div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/** The board failed to load and there is nothing to show: what happened, and a retry. */
export function BoardError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  const requestId = isApiError(error) ? error.requestId : undefined;
  return (
    <StateCard
      role="alert"
      tone="error"
      icon={<CircleAlert strokeWidth={1.75} className="size-5" />}
      title="The leaderboard did not load."
      actions={
        <Button variant="secondary" size="sm" onClick={onRetry} loading={retrying}>
          <RotateCw aria-hidden="true" strokeWidth={1.75} />
          Try again
        </Button>
      }
    >
      <p>{getUserMessage(error)}</p>
      {requestId ? (
        <p className="mt-2 font-mono text-caption text-muted">Request id {requestId}</p>
      ) : null}
    </StateCard>
  );
}

/** The API answered, but no model has a rating yet. */
export function BoardEmpty() {
  return (
    <StateCard
      role="status"
      icon={<Swords strokeWidth={1.75} className="size-5" />}
      title="No model is ranked yet."
      actions={
        <a href={ARENA_HREF} className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          Start the first battle
        </a>
      }
    >
      <p>Ratings appear after the first votes. Every battle you judge moves the board.</p>
    </StateCard>
  );
}

/** Filters that match nothing, with a way back. */
export function BoardNoMatch({ query, onClear }: { query: string; onClear: () => void }) {
  const trimmed = query.trim();
  return (
    <StateCard
      icon={<SearchX strokeWidth={1.75} className="size-5" />}
      title={trimmed ? `No model matches “${trimmed}”.` : 'No model matches these filters.'}
      actions={
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear the filters
        </Button>
      }
    >
      <p>Try part of a name, such as “llama” or “gemma”, or another provider.</p>
    </StateCard>
  );
}

/** Table-shaped placeholder rows, in the prerendered HTML and while the board loads. */
export function BoardSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-raise"
    >
      <div className="h-10 border-b border-line bg-surface-2" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-7" />
          <Skeleton className="h-4 w-1/3 max-w-64" />
          <Skeleton className="ml-auto hidden h-1 w-24 md:block" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="hidden h-4 w-12 sm:block" />
        </div>
      ))}
    </div>
  );
}
