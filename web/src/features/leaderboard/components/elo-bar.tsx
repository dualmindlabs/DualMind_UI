import { cn } from '@/lib/utils/cn';

export interface EloBarProps {
  /** Position between the lowest (ELO_BAR_FLOOR) and the highest rating (1) on the board. */
  share: number;
  /** `lead` for the first place. */
  tone?: 'default' | 'lead';
  className?: string;
}

/**
 * The inline Elo bar: a hairline track with the rating's share of the board's range. It grows in
 * once when it mounts (transform only) and glides when a refresh moves the rating. Decorative:
 * the number next to it is the value.
 */
export function EloBar({ share, tone = 'default', className }: EloBarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative block h-1 w-full overflow-hidden rounded-full bg-line', className)}
    >
      <span
        style={{ transform: `scaleX(${Math.min(1, Math.max(0, share)).toFixed(4)})` }}
        className={cn(
          'absolute inset-0 origin-left animate-grow rounded-full transition-transform duration-(--dur-slow) ease-out-expo [animation-duration:var(--dur-cinematic)]',
          tone === 'lead' ? 'bg-mind-a' : 'bg-mind-a/70',
        )}
      />
    </span>
  );
}
