import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';

/**
 * When the daily count starts again: the next 00:00 UTC, which the backend counts as the day's end
 * (05:30 in India). Shown in the visitor's own clock, since "today" is the backend's, not theirs.
 */
export function nextResetTime(now: Date, locale?: string): string {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(next);
}

/**
 * "3 of 5 free battles left today". `remaining` is clamped to 0..limit. The numbers come from the
 * backend and are per server process, so the wording stays a plain count, with no promise. A polite
 * live region announces the count when a battle changes it, and the reset time says when "today"
 * ends (worked out after mount, in the visitor's time zone, so the prerendered page matches).
 */
export function BattlesLeft({
  remaining,
  limit,
  noun = 'battles',
  className,
  now,
}: {
  remaining: number;
  limit: number;
  /** What is counted: "free battles", "private battles". */
  noun?: string;
  className?: string;
  /** The clock, for tests. Default: the current time. */
  now?: Date;
}) {
  const left = Math.max(0, Math.min(limit, remaining));
  const [reset, setReset] = useState<string | null>(null);
  useEffect(() => {
    // The time zone is only known in the browser; the first render matches the prerendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only value
    setReset(nextResetTime(now ?? new Date()));
  }, [now]);
  return (
    <span
      data-testid="battles-left"
      role="status"
      aria-live="polite"
      className={cn('text-caption text-muted tabular-nums', className)}
    >
      {left} of {limit} {noun} left today
      {reset ? <span data-testid="battles-reset">{` · resets at ${reset}`}</span> : null}
    </span>
  );
}
