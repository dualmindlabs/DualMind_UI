import { type RefObject, useEffect, useState } from 'react';

export interface ScrollEdges {
  /** Content is hidden before the start edge (scrolled away from the start). */
  start: boolean;
  /** Content is hidden past the end edge. */
  end: boolean;
}

const NONE: ScrollEdges = { start: false, end: false };

/** Which sides of a horizontal scroller hide content (1px of slack for subpixel widths). */
export function scrollEdges(
  element: Pick<HTMLElement, 'scrollLeft' | 'scrollWidth' | 'clientWidth'>,
): ScrollEdges {
  const max = element.scrollWidth - element.clientWidth;
  if (max <= 1) return NONE;
  // Right-to-left scrollers report a negative scrollLeft.
  const offset = Math.abs(element.scrollLeft);
  return { start: offset > 1, end: offset < max - 1 };
}

/**
 * Tracks which edges of a horizontal scroller hide content, for edge fades and scroll cues. It
 * follows scrolling, the scroller's size, and its content (pass a `contentKey` that changes when
 * the items do). A row that does not scroll (it wraps, on wide screens) reports no edges.
 */
export function useScrollEdges(
  ref: RefObject<HTMLElement | null>,
  contentKey?: unknown,
): ScrollEdges {
  const [edges, setEdges] = useState<ScrollEdges>(NONE);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = scrollEdges(element);
        setEdges(current =>
          current.start === next.start && current.end === next.end ? current : next,
        );
      });
    };
    update();
    element.addEventListener('scroll', update, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(element);
    for (const child of Array.from(element.children)) resize?.observe(child);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('scroll', update);
      resize?.disconnect();
    };
  }, [ref, contentKey]);

  return edges;
}
