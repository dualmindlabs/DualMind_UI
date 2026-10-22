import { Check, ChevronDown, Columns2 } from 'lucide-react';
import { type ReactNode, type TouchEvent, useCallback, useEffect, useRef, useState } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import { EXPO, playOn } from './stage-motion';

export interface PanePairProps {
  a: ReactNode;
  b: ReactNode;
  /** Names the pair for the switcher ("Answers to prompt 2"). */
  label: string;
  /** Which sides are still writing: their tab pulses. */
  writing?: { a: boolean; b: boolean };
  /**
   * The answers are final, so reading them counts. Default true (a past turn); a live turn passes
   * false while the models write.
   */
  ready?: boolean;
  /** Called once per side, the first time that answer has been read to its end. */
  onRead?: (side: 'a' | 'b') => void;
  /** Arrow keys switch the answer anywhere on the page (the newest turn only). */
  keyboard?: boolean;
  className?: string;
}

type Side = 'a' | 'b';
type View = Side | 'compare';

const SIDES = [
  { id: 'a', label: 'Answer A' },
  { id: 'b', label: 'Answer B' },
] as const;

const READ_AT = 0.97;

function inTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/**
 * Focus: one answer at a time. A calm reading column holds the answer in view; a switcher above
 * it (swipe on a phone, the arrow keys on a desktop, or a tap) moves to the other, and a hairline
 * under each tab fills as that answer is read down to its end. Compare is the opt-in side by side
 * (stacked and folded on a phone). Answers not in view stay in the page for screen readers and
 * find-in-page (parked off to the side, out of the tab order); the switcher says what has been
 * read, and `onRead` tells the turn when both have been, which is when the vote pill rises.
 */
export function PanePair({
  a,
  b,
  label,
  writing,
  ready = true,
  onRead,
  keyboard = false,
  className,
}: PanePairProps) {
  const reduce = useShouldReduceMotion();
  const [view, setView] = useState<View>('a');
  const [last, setLast] = useState<Side>('a');
  const [open, setOpen] = useState<{ a: boolean; b: boolean }>({ a: false, b: false });
  const [progress, setProgress] = useState<{ a: number; b: number }>({ a: 0, b: 0 });
  const [switched, setSwitched] = useState(false);
  const comparing = view === 'compare';
  const slots = useRef<{ a: HTMLDivElement | null; b: HTMLDivElement | null }>({
    a: null,
    b: null,
  });
  const ends = useRef<{ a: HTMLDivElement | null; b: HTMLDivElement | null }>({
    a: null,
    b: null,
  });
  const told = useRef({ a: false, b: false });
  const progressRef = useRef({ a: 0, b: 0 });
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  const bump = useCallback((side: Side, value: number) => {
    if (value <= progressRef.current[side] + 0.01 && value < 1) return;
    progressRef.current = {
      ...progressRef.current,
      [side]: Math.max(progressRef.current[side], value),
    };
    setProgress(progressRef.current);
    if (value >= READ_AT && !told.current[side]) {
      told.current[side] = true;
      onReadRef.current?.(side);
    }
  }, []);

  // Reading depth: how far down the answer the bottom of the screen has got. Any scroller counts
  // (the thread has its own), so the listener sits on the window in the capture phase.
  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      for (const side of ['a', 'b'] as const) {
        const element = slots.current[side];
        if (!element) continue;
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0 || box.right < 0 || box.left > window.innerWidth) {
          continue;
        }
        const line = window.innerHeight * 0.86;
        bump(side, Math.min(1, Math.max(0, (line - box.top) / box.height)));
      }
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [ready, view, bump]);

  // The end of an answer coming on screen is the surest sign it was read to the end.
  useEffect(() => {
    if (!ready || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const side = (entry.target as HTMLElement).dataset.end as Side;
          bump(side, 1);
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    for (const side of ['a', 'b'] as const) {
      const element = ends.current[side];
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [ready, view, bump]);

  const show = useCallback(
    (next: View, direction: 1 | -1 = next === 'b' ? 1 : -1) => {
      setSwitched(true);
      setView(next);
      if (next !== 'compare') {
        setLast(next);
        if (!reduce) {
          // The next frame, when the slot has moved into the column.
          requestAnimationFrame(() =>
            playOn(
              slots.current[next],
              [
                { opacity: 0, transform: `translateX(${direction * 28}px)` },
                { opacity: 1, transform: 'none' },
              ],
              { duration: 380, easing: EXPO },
            ),
          );
        }
      }
    },
    [reduce],
  );

  // Arrows switch, anywhere on the page, outside text fields and open dialogs.
  useEffect(() => {
    if (!keyboard) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (inTextField(event.target)) return;
      if (document.querySelector('[aria-modal="true"], [role="menu"]')) return;
      if (comparing) return;
      const to: Side = event.key === 'ArrowRight' ? 'b' : 'a';
      if (to === view) return;
      event.preventDefault();
      show(to, to === 'b' ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keyboard, comparing, view, show]);

  const onTouchStart = (event: TouchEvent) => {
    const point = event.touches[0];
    if (!point || comparing || event.touches.length > 1) return;
    const target = event.target as HTMLElement;
    // Code and tables scroll sideways on their own: a swipe there is theirs.
    touch.current = {
      x: point.clientX,
      y: point.clientY,
      ok: target.closest('pre, table, [data-scroll-x]') === null,
    };
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    const point = event.changedTouches[0];
    if (!start?.ok || !point || comparing) return;
    const dx = point.clientX - start.x;
    const dy = point.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0 && view === 'a') show('b', 1);
    else if (dx > 0 && view === 'b') show('a', -1);
  };

  const bothRead = progress.a >= READ_AT && progress.b >= READ_AT;
  const slotList = [
    { id: 'a', node: a },
    { id: 'b', node: b },
  ] as const;

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-6', className)} data-view={view}>
      <div className="sticky top-2 z-10 flex flex-col items-center gap-2">
        <div
          role="group"
          aria-label={label}
          className="flex max-w-full items-center gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-lift backdrop-blur-md"
        >
          {SIDES.map(side => {
            const value = progress[side.id];
            const done = ready && value >= READ_AT;
            return (
              <button
                key={side.id}
                type="button"
                aria-pressed={view === side.id}
                aria-keyshortcuts={side.id === 'a' ? 'ArrowLeft' : 'ArrowRight'}
                onClick={() => show(side.id)}
                className={cn(
                  'group/tab relative flex h-11 min-w-0 items-center justify-center gap-2 overflow-hidden rounded-full px-4 text-ui font-medium text-fg-soft transition-[background-color,color] duration-(--dur-fast) ease-out-expo sm:min-w-36 pointer-coarse:h-12',
                  'hover:text-fg aria-pressed:bg-surface-2 aria-pressed:text-fg',
                )}
              >
                <span aria-hidden="true" className="inline-flex">
                  <RoleBadge who={side.id} letterOnly size="sm" />
                </span>
                <span className="truncate">{side.label}</span>
                {writing?.[side.id] ? (
                  <span
                    aria-hidden="true"
                    data-testid={`writing-${side.id}`}
                    className={cn(
                      'size-1.5 rounded-full motion-safe:animate-pulse',
                      side.id === 'a' ? 'bg-mind-a' : 'bg-mind-b',
                    )}
                  />
                ) : done ? (
                  <Check
                    aria-hidden="true"
                    className={cn('size-3.5', side.id === 'a' ? 'text-mind-a' : 'text-mind-b-text')}
                    strokeWidth={2.25}
                  />
                ) : null}
                <span
                  aria-hidden="true"
                  className="bg-line-subtle absolute inset-x-4 bottom-1 h-0.5 overflow-hidden rounded-full"
                >
                  <span
                    data-testid={`read-${side.id}`}
                    className={cn(
                      'block h-full origin-left rounded-full transition-transform duration-(--dur-base) ease-out-expo',
                      side.id === 'a' ? 'bg-mind-a' : 'bg-mind-b',
                    )}
                    style={{ transform: `scaleX(${ready ? value : 0})` }}
                  />
                </span>
              </button>
            );
          })}
          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-line" />
          <button
            type="button"
            aria-pressed={comparing}
            onClick={() => show(comparing ? last : 'compare', 1)}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-full px-3.5 text-ui font-medium text-fg-soft transition-[background-color,color] duration-(--dur-fast) ease-out-expo sm:px-4 pointer-coarse:h-12',
              'hover:text-fg aria-pressed:bg-surface-2 aria-pressed:text-fg',
            )}
          >
            <Columns2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
            <span className="max-sm:sr-only">Compare</span>
          </button>
        </div>
        {!switched && !comparing ? (
          <p
            aria-hidden="true"
            className="hidden text-caption text-muted md:block pointer-coarse:hidden"
          >
            Use the left and right arrow keys to switch answers
          </p>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {ready
            ? bothRead
              ? 'You have read both answers. Voting is open.'
              : 'Read both answers to open the vote.'
            : 'The models are still writing.'}
        </p>
      </div>
      <div
        data-testid="pane-stage"
        className={cn(
          'relative',
          'min-w-0',
          comparing
            ? 'grid grid-cols-[minmax(0,1fr)] gap-10 md:grid-cols-2 md:gap-8'
            : 'mx-auto w-full max-w-[42rem]',
        )}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {slotList.map(slot => {
          const active = comparing || view === slot.id;
          return (
            <div
              key={slot.id}
              ref={element => {
                slots.current[slot.id] = element;
              }}
              data-active={active ? '' : undefined}
              {...(active ? {} : { inert: true })}
              className={cn(
                'min-w-0',
                // Parked, not removed: still in the page for screen readers' browse mode and find.
                !active && 'pointer-events-none absolute top-0 -left-[200vw] w-full',
              )}
            >
              <div
                className={cn(
                  'relative flex min-w-0 flex-col [&>*]:flex-1',
                  comparing &&
                    !open[slot.id] &&
                    'max-md:max-h-96 max-md:overflow-hidden max-md:[mask-image:linear-gradient(to_bottom,#000_70%,transparent)]',
                )}
              >
                {slot.node}
              </div>
              <div
                aria-hidden="true"
                data-end={slot.id}
                ref={element => {
                  ends.current[slot.id] = element;
                }}
                className="h-px"
              />
              {comparing ? (
                <button
                  type="button"
                  aria-expanded={open[slot.id]}
                  onClick={() => setOpen(current => ({ ...current, [slot.id]: !current[slot.id] }))}
                  className="mx-auto mt-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-line px-4 text-ui-sm font-medium text-fg-soft hover:text-fg md:hidden"
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
          );
        })}
      </div>
    </div>
  );
}
