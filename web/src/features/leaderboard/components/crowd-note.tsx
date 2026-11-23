import { ArrowRight } from 'lucide-react';

import { formatCount } from '../lib/format';
import type { Leaderboard } from '../types';

/**
 * Under the status line on the crowd board: what the numbers are (fitted from blind votes, with
 * the method id), a notice for a stale or seeded board, and the way to the methodology page.
 */
export function CrowdNote({
  crowd,
  category,
}: {
  crowd: NonNullable<Leaderboard['crowd']>;
  category?: string | undefined;
}) {
  return (
    <div data-testid="crowd-note" className="grid gap-2 text-caption text-muted">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Rated from <span className="numeric text-fg-soft">{formatCount(crowd.voteCount)}</span>{' '}
          blind {crowd.voteCount === 1 ? 'vote' : 'votes'}
          {category ? ` in ${category}` : ''}
          {crowd.methodology ? (
            <>
              , method <span className="font-mono text-fg-soft">{crowd.methodology}</span>
            </>
          ) : null}
          . The line on each bar is the 95% interval.
        </span>
        <a
          href="/methodology/"
          className="inline-flex items-center gap-1 rounded-sm text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
        >
          Methodology
          <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
        </a>
      </p>
      {crowd.degraded ? (
        <p role="status" className="text-warn">
          This board is a stale copy or built without votes while the rating job catches up.
        </p>
      ) : null}
    </div>
  );
}
