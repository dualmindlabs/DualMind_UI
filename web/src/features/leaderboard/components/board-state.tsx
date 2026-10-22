import { CircleAlert, Hourglass, RotateCw, SearchX, Swords, WifiOff } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserMessage, isApiError, isConnectivityError, isRateLimitError } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { ARENA_HREF } from '../lib/constants';

/** Used when a 429 carries no Retry-After: long enough to matter, short enough to wait out. */
const DEFAULT_COOLDOWN_SECONDS = 15;

type Tone = 'default' | 'error' | 'warn';

const toneBorder: Record<Tone, string> = {
  default: 'border-line',
  error: 'border-bad/45',
  warn: 'border-warn/50',
};
const toneIcon: Record<Tone, string> = {
  default: 'border-line text-fg-soft',
  error: 'border-bad/45 text-bad',
  warn: 'border-warn/50 text-warn',
};

/** Ghost bars of a podium and a few rows behind the message: the page keeps its shape. */
function GhostBoard() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 items-end gap-2 [mask-image:linear-gradient(to_left,black,transparent)] px-8 pb-8 opacity-60 md:flex"
    >
      {[0.55, 0.85, 0.4].map((height, index) => (
        <span
          key={index}
          style={{ height: `${height * 100}%` }}
          className="flex-1 rounded-t-md border border-b-0 border-line bg-surface-3"
        />
      ))}
    </div>
  );
}

function StateCard({
  icon,
  title,
  children,
  actions,
  tone = 'default',
  role,
  kind,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  tone?: Tone;
  role?: 'alert' | 'status';
  kind: string;
}) {
  return (
    <div
      role={role}
      data-state={kind}
      className={cn(
        'surface-duel relative grid justify-items-start gap-5 overflow-hidden px-6 py-9 sm:px-9 sm:py-11',
        toneBorder[tone],
      )}
    >
      <GhostBoard />
      <span
        aria-hidden="true"
        className={cn(
          'relative grid size-12 place-items-center rounded-lg border bg-surface-3 shadow-raise',
          toneIcon[tone],
        )}
      >
        {icon}
      </span>
      <div className="relative grid max-w-reading gap-2">
        <h3 className="text-h3 font-semibold text-fg">{title}</h3>
        <div className="text-ui text-fg-soft">{children}</div>
      </div>
      {actions ? <div className="relative flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

/** Counts down whole seconds from `from`; 0 when it is over. Starts again for a new `cause`. */
function useCountdown(from: number, cause: unknown): number {
  const [state, setState] = useState({ cause, left: from });
  if (state.cause !== cause) setState({ cause, left: from });
  useEffect(() => {
    if (from <= 0) return undefined;
    const id = window.setInterval(
      () => setState(current => ({ ...current, left: Math.max(0, current.left - 1) })),
      1000,
    );
    return () => window.clearInterval(id);
  }, [from, cause]);
  return state.cause === cause ? state.left : from;
}

function RateLimited({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  const retryAfterMs = isApiError(error) ? error.retryAfterMs : undefined;
  const wait = Math.max(1, Math.ceil((retryAfterMs ?? DEFAULT_COOLDOWN_SECONDS * 1000) / 1000));
  const left = useCountdown(wait, error);
  const requestId = isApiError(error) ? error.requestId : undefined;

  return (
    <StateCard
      kind="rate-limited"
      role="alert"
      tone="warn"
      icon={<Hourglass strokeWidth={1.75} className="size-5" />}
      title="The board is catching its breath."
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            loading={retrying}
            disabled={left > 0}
          >
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
          {left > 0 ? (
            <span aria-hidden="true" className="numeric text-ui-sm text-muted">
              in {left}s
            </span>
          ) : null}
        </>
      }
    >
      <p>
        Too many requests came in at once, so the rankings are paused for a moment. Nothing is
        broken and nothing was lost.{' '}
        {left > 0 ? `You can try again in ${left} seconds.` : 'You can try again now.'}
      </p>
      {requestId ? (
        <p className="mt-2 font-mono text-caption text-muted">Request id {requestId}</p>
      ) : null}
    </StateCard>
  );
}

/**
 * The board failed to load and there is nothing to show: what happened, and a retry. A rate
 * limit gets its own card with a countdown, a lost connection says so, and anything else shows
 * the API's message and the request id for support.
 */
export function BoardError({
  error,
  onRetry,
  retrying,
}: {
  error: unknown;
  onRetry: () => void;
  retrying: boolean;
}) {
  if (isRateLimitError(error)) {
    return <RateLimited error={error} onRetry={onRetry} retrying={retrying} />;
  }
  const requestId = isApiError(error) ? error.requestId : undefined;
  const offline = isConnectivityError(error);
  return (
    <StateCard
      kind={offline ? 'offline' : 'error'}
      role="alert"
      tone="error"
      icon={
        offline ? (
          <WifiOff strokeWidth={1.75} className="size-5" />
        ) : (
          <CircleAlert strokeWidth={1.75} className="size-5" />
        )
      }
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
      kind="empty"
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
      kind="no-match"
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
    <div aria-hidden="true" className="surface-duel overflow-hidden">
      <div className="h-10 border-b border-line bg-surface-3" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b border-line px-4 py-4 last:border-b-0"
        >
          <Skeleton className="h-4 w-7" />
          <Skeleton className="hidden size-9 sm:block" />
          <div className="grid w-1/3 max-w-64 gap-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="ml-auto hidden h-1.5 w-28 md:block" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="hidden h-4 w-12 sm:block" />
        </div>
      ))}
    </div>
  );
}
