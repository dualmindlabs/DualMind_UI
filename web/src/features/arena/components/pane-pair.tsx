import { type ReactNode, type UIEvent, useRef, useState } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface PanePairProps {
  a: ReactNode;
  b: ReactNode;
  /** Names the pair for the phone switch ("Answers to prompt 2"). */
  label: string;
  className?: string;
}

const SIDES = [
  { id: 'a', label: 'Answer A' },
  { id: 'b', label: 'Answer B' },
] as const;

/**
 * Two answers. From the `md` breakpoint they sit side by side, 50/50, A on the left. On phones
 * they share one swipeable row (CSS scroll snap) with an A / B switch above it that follows the
 * swipe; both panes stay in the page, in order, for screen readers and find-in-page.
 */
export function PanePair({ a, b, label, className }: PanePairProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<'a' | 'b'>('a');
  const reduce = useShouldReduceMotion();

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.clientWidth === 0) return;
    setVisible(element.scrollLeft > element.clientWidth / 2 ? 'b' : 'a');
  };

  const show = (side: 'a' | 'b') => {
    const element = scroller.current;
    if (!element) return;
    setVisible(side);
    element.scrollTo({
      left: side === 'a' ? 0 : element.scrollWidth,
      behavior: reduce ? 'auto' : 'smooth',
    });
  };

  return (
    <div className={cn('grid gap-3', className)}>
      <div
        role="group"
        aria-label={label}
        className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface p-1 md:hidden"
      >
        {SIDES.map(side => (
          <button
            key={side.id}
            type="button"
            aria-pressed={visible === side.id}
            onClick={() => show(side.id)}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-full text-ui-sm font-medium text-fg-soft transition-colors duration-(--dur-fast) ease-out-expo',
              'aria-pressed:bg-surface-3 aria-pressed:text-fg',
            )}
          >
            <RoleBadge who={side.id} letterOnly size="sm" />
            {side.label}
          </button>
        ))}
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        className={cn(
          // Phones: one row, one pane per screen width, snapping; overscroll stays inside.
          'flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden',
          '*:w-full *:shrink-0 *:snap-center *:snap-always',
          // From md: a plain two-column grid.
          'md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:*:w-auto',
        )}
      >
        {a}
        {b}
      </div>
    </div>
  );
}
