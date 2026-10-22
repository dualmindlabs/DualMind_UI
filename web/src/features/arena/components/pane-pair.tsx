import { ChevronDown, Columns2 } from 'lucide-react';
import { type ReactNode, type UIEvent, useRef, useState } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface PanePairProps {
  a: ReactNode;
  b: ReactNode;
  /** Names the pair for the phone switch ("Answers to prompt 2"). */
  label: string;
  /** Which sides are still writing: their tab pulses (phones only). */
  writing?: { a: boolean; b: boolean };
  className?: string;
}

type View = 'a' | 'b' | 'compare';

const SIDES = [
  { id: 'a', label: 'Answer A' },
  { id: 'b', label: 'Answer B' },
] as const;

/**
 * Two answers. From the `md` breakpoint they sit side by side, 50/50, A on the left. On phones
 * they share one swipeable row (CSS scroll snap) with a segmented A / B / Compare switch above
 * it, sticky under the header: the A and B tabs follow the swipe and pulse while their model is
 * still writing; Compare stacks both answers, folded to a few lines each with an expander, so
 * the two can be read against each other without swiping. All panes stay in the page, in order,
 * for screen readers and find-in-page.
 */
export function PanePair({ a, b, label, writing, className }: PanePairProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>('a');
  const [open, setOpen] = useState<{ a: boolean; b: boolean }>({ a: false, b: false });
  const reduce = useShouldReduceMotion();
  const comparing = view === 'compare';

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    if (comparing) return;
    const element = event.currentTarget;
    if (element.clientWidth === 0) return;
    setView(element.scrollLeft > element.clientWidth / 2 ? 'b' : 'a');
  };

  const show = (next: View) => {
    setView(next);
    const element = scroller.current;
    if (!element || next === 'compare') return;
    // The row is laid out as one column only once the switch left Compare: wait a frame.
    requestAnimationFrame(() =>
      element.scrollTo({
        left: next === 'a' ? 0 : element.scrollWidth,
        behavior: reduce ? 'auto' : 'smooth',
      }),
    );
  };

  const slots = [
    { id: 'a', node: a },
    { id: 'b', node: b },
  ] as const;

  return (
    <div className={cn('grid gap-3', className)}>
      <div
        role="group"
        aria-label={label}
        className="sticky top-14 z-10 grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1 shadow-raise md:hidden"
      >
        {SIDES.map(side => (
          <button
            key={side.id}
            type="button"
            aria-pressed={view === side.id}
            onClick={() => show(side.id)}
            className={cn(
              'relative flex h-10 items-center justify-center gap-1.5 rounded-full text-ui-sm font-medium text-fg-soft transition-[background-color,color] duration-(--dur-fast) ease-out-expo',
              'aria-pressed:bg-surface-3 aria-pressed:text-fg aria-pressed:shadow-raise',
            )}
          >
            <span aria-hidden="true" className="inline-flex">
              <RoleBadge who={side.id} letterOnly size="sm" />
            </span>
            {side.label}
            {writing?.[side.id] ? (
              <span
                aria-hidden="true"
                data-testid={`writing-${side.id}`}
                className={cn(
                  'absolute top-1.5 right-2.5 size-1.5 rounded-full motion-safe:animate-pulse',
                  side.id === 'a' ? 'bg-mind-a' : 'bg-mind-b',
                )}
              />
            ) : null}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={comparing}
          onClick={() => show('compare')}
          className={cn(
            'flex h-10 items-center justify-center gap-1.5 rounded-full text-ui-sm font-medium text-fg-soft transition-[background-color,color] duration-(--dur-fast) ease-out-expo',
            'aria-pressed:bg-surface-3 aria-pressed:text-fg aria-pressed:shadow-raise',
          )}
        >
          <Columns2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Compare
        </button>
      </div>
      <div
        ref={scroller}
        onScroll={onScroll}
        data-view={view}
        className={cn(
          // Phones: one row, one pane per screen width, snapping; overscroll stays inside.
          'flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden',
          '*:w-full *:shrink-0 *:snap-center *:snap-always',
          // Compare: both answers one under the other, folded.
          comparing && 'max-md:snap-none max-md:flex-col max-md:overflow-visible',
          // From md: a plain two-column grid.
          'md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:*:w-auto',
        )}
      >
        {slots.map(slot => (
          <div key={slot.id} className="relative flex min-w-0 flex-col md:contents">
            <div
              className={cn(
                'flex min-w-0 flex-col [&>*]:flex-1',
                comparing &&
                  !open[slot.id] &&
                  'max-md:max-h-72 max-md:overflow-hidden max-md:[mask-image:linear-gradient(to_bottom,#000_70%,transparent)]',
                'md:contents',
              )}
            >
              {slot.node}
            </div>
            {comparing ? (
              <button
                type="button"
                aria-expanded={open[slot.id]}
                onClick={() => setOpen(current => ({ ...current, [slot.id]: !current[slot.id] }))}
                className="mt-1 inline-flex h-10 items-center justify-center gap-1.5 self-center rounded-full border border-line px-4 text-ui-sm font-medium text-fg-soft hover:text-fg md:hidden"
              >
                <ChevronDown
                  aria-hidden="true"
                  className={cn('size-4 transition-transform', open[slot.id] && 'rotate-180')}
                  strokeWidth={1.75}
                />
                {open[slot.id] ? 'Fold' : 'Read all'} Answer {slot.id.toUpperCase()}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
