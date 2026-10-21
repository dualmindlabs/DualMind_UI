import { cn } from '@/lib/utils/cn';

/**
 * A small status dot. `live` pulses a ring four times (transform and opacity only; none under reduced
 * motion), `idle` is a quiet grey dot while data loads, `off` marks a failed source. Decorative:
 * the text next to it says the same thing.
 */
export function LiveDot({
  tone = 'live',
  className,
}: {
  tone?: 'live' | 'idle' | 'off';
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn('relative inline-flex size-2 shrink-0', className)}>
      {tone === 'live' ? (
        <span className="absolute inset-0 animate-ping rounded-full bg-ok opacity-60 [animation-iteration-count:4] motion-reduce:hidden" />
      ) : null}
      <span
        className={cn(
          'relative inline-flex size-2 rounded-full',
          tone === 'live' && 'bg-ok',
          tone === 'idle' && 'bg-line-strong',
          tone === 'off' && 'bg-warn',
        )}
      />
    </span>
  );
}
