import { cn } from '@/lib/utils/cn';

/** What a pane's header says about the answer while it is still being written. */
export interface LiveStats {
  /** 0 to 1 (how much of the answer is on screen), or null when nothing may be said about it. */
  progress: number | null;
  /** Characters on screen so far; omitted while the names are hidden (length hints at the model). */
  chars?: number;
  /** Tokens per second, estimated from the characters on screen; same rule as `chars`. */
  tokensPerSecond?: number;
}

function compact(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

/** Two small mono readouts for the header: speed and length. Nothing when there are no numbers. */
export function LiveReadout({ stats }: { stats: LiveStats }) {
  if (stats.chars === undefined && stats.tokensPerSecond === undefined) return null;
  return (
    <span
      data-testid="pane-live-stats"
      className="hidden items-center gap-2 font-mono text-caption text-fg-soft tabular-nums sm:inline-flex"
    >
      {stats.tokensPerSecond === undefined ? null : (
        <span>
          <span className="text-fg">{Math.round(stats.tokensPerSecond)}</span> tok/s
        </span>
      )}
      {stats.chars === undefined ? null : (
        <span>
          <span className="text-fg">{compact(stats.chars)}</span> chars
        </span>
      )}
    </span>
  );
}

/**
 * The streaming meter under the header: a hairline track with a fill in the pane's colour that
 * grows with the answer (transform only). With no figure to show it sweeps instead, so the pane
 * still reads as alive. Reduced motion: the fill jumps and the sweep rests as a half bar.
 */
export function StreamMeter({
  side,
  stats,
  active,
}: {
  side: 'a' | 'b' | 'solo';
  stats: LiveStats | undefined;
  active: boolean;
}) {
  const fill = side === 'b' ? 'bg-mind-b' : side === 'a' ? 'bg-mind-a' : 'bg-fg-soft';
  const progress = stats?.progress ?? null;
  return (
    <div
      aria-hidden="true"
      data-testid={active ? 'pane-progress' : undefined}
      className="relative h-0.5 overflow-hidden bg-line/60"
    >
      {active ? (
        progress === null ? (
          <span
            className={cn(
              'absolute inset-y-0 left-0 w-full origin-left -translate-x-full scale-x-50 motion-safe:animate-skeleton motion-reduce:translate-x-0',
              fill,
            )}
          />
        ) : (
          <span
            className={cn(
              'absolute inset-0 origin-left transition-transform duration-(--dur-base) ease-linear',
              fill,
            )}
            style={{ transform: `scaleX(${Math.min(1, Math.max(0.02, progress))})` }}
          />
        )
      ) : null}
    </div>
  );
}
