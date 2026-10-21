import { RotateCw, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getUserMessage } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { formatClock, formatCount } from '../lib/format';

export interface BoardStatusProps {
  shown: number;
  total: number;
  /** The noun for the count: "models". */
  noun?: string;
  /** When the board on screen was fetched. */
  updatedAt: number;
  refreshing: boolean;
  /** The last refresh failed; the board on screen is older. */
  refreshError: unknown;
  onRefresh: () => void;
  /** The data comes from the mock adapter (demo mode). */
  isMock: boolean;
  className?: string;
}

/**
 * The line above the board: how many models are shown (announced politely as filters change),
 * a demo label in mock mode, a manual refresh, and the stale-data note when a background
 * refresh fails while older numbers stay on screen.
 */
export function BoardStatus({
  shown,
  total,
  noun = 'models',
  updatedAt,
  refreshing,
  refreshError,
  onRefresh,
  isMock,
  className,
}: BoardStatusProps) {
  const stale = refreshError !== null && refreshError !== undefined;

  return (
    <div className={cn('grid gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-ui-sm text-fg-soft">
          {shown === total ? (
            <>
              <span className="font-mono text-fg tabular-nums">{formatCount(total)}</span> {noun}
            </>
          ) : (
            <>
              Showing <span className="font-mono text-fg tabular-nums">{formatCount(shown)}</span>{' '}
              of <span className="font-mono tabular-nums">{formatCount(total)}</span> {noun}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {isMock ? <Badge variant="warn">Demo data</Badge> : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            loading={refreshing}
            className="text-caption"
          >
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Refresh
            <span className="sr-only"> the leaderboard</span>
          </Button>
        </div>
      </div>
      {stale ? (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 rounded-md border border-warn/40 bg-surface px-4 py-3 text-ui-sm text-fg-soft"
        >
          <TriangleAlert
            aria-hidden="true"
            strokeWidth={1.75}
            className="mt-0.5 size-4 text-warn"
          />
          <p className="min-w-0 flex-1">
            <span className="font-medium text-fg">These numbers may be out of date.</span> The last
            refresh failed ({getUserMessage(refreshError)}), so this is still the board from{' '}
            <time dateTime={new Date(updatedAt).toISOString()}>{formatClock(updatedAt)}</time>.
          </p>
          <Button variant="secondary" size="xs" onClick={onRefresh} loading={refreshing}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
