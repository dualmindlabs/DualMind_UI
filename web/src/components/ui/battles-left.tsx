import { cn } from '@/lib/utils/cn';

/**
 * "3 of 5 free battles left today". `remaining` is clamped to 0..limit. The numbers come from the
 * backend and are per server process, so the wording stays a plain count, with no promise.
 */
export function BattlesLeft({
  remaining,
  limit,
  noun = 'battles',
  className,
}: {
  remaining: number;
  limit: number;
  /** What is counted: "free battles", "private battles". */
  noun?: string;
  className?: string;
}) {
  const left = Math.max(0, Math.min(limit, remaining));
  return (
    <span
      data-testid="battles-left"
      className={cn('text-caption text-muted tabular-nums', className)}
    >
      {left} of {limit} {noun} left today
    </span>
  );
}
