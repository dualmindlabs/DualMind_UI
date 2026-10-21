import { ChevronRight } from 'lucide-react';
import { type ReactNode, useCallback, useRef } from 'react';

import { cn } from '@/lib/utils/cn';

import { useScrollEdges } from '../hooks/use-scroll-edges';

/** The fade at each scrollable edge: content runs out under a 2.5rem mask, never a hard cut. */
const FADES = cn(
  'data-[fade=end]:[mask-image:linear-gradient(to_right,black_calc(100%_-_2.5rem),transparent)]',
  'data-[fade=start]:[mask-image:linear-gradient(to_left,black_calc(100%_-_2.5rem),transparent)]',
  'data-[fade=both]:[mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%_-_2.5rem),transparent)]',
);

export interface ScrollRowProps {
  /** `ul` for a list of items (each child an `li`). */
  as?: 'div' | 'ul';
  /** Changes when the items change (a new category), so the edges are measured again. */
  contentKey?: unknown;
  className?: string;
  children: ReactNode;
}

/**
 * A row of chips that scrolls sideways on narrow screens (UI audit P2-9): scroll snapping (give
 * each item `snap-start`), a fade where content continues past an edge, and a chevron over the
 * end fade as the cue that there is more. Where the row fits (it wraps on wide screens), none of
 * that shows. The chevron is decoration: every item stays reachable by swipe and by Tab (focus
 * scrolls it in).
 */
export function ScrollRow({ as = 'div', contentKey, className, children }: ScrollRowProps) {
  const element = useRef<HTMLElement | null>(null);
  const setElement = useCallback((node: HTMLElement | null) => {
    element.current = node;
  }, []);
  const { start, end } = useScrollEdges(element, contentKey);
  const fade = start && end ? 'both' : start ? 'start' : end ? 'end' : undefined;
  const rowClass = cn(
    'flex min-w-0 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain py-1.5 [&::-webkit-scrollbar]:hidden',
    FADES,
    className,
  );

  return (
    <div className="relative min-w-0" data-scroll-row="">
      {as === 'ul' ? (
        <ul ref={setElement} data-scroller="" data-fade={fade} className={rowClass}>
          {children}
        </ul>
      ) : (
        <div ref={setElement} data-scroller="" data-fade={fade} className={rowClass}>
          {children}
        </div>
      )}
      {end ? (
        <span
          aria-hidden="true"
          data-testid="scroll-cue"
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-muted"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </span>
      ) : null}
    </div>
  );
}
