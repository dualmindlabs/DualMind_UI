import { type RefObject, useEffect, useState } from 'react';

import { useHydrated } from './use-hydrated';

export interface InViewOptions {
  /** Stop watching after the first time the element is in view. */
  once?: boolean;
  /** Grows or shrinks the viewport, like IntersectionObserver's rootMargin ("200px", "-10% 0px"). */
  rootMargin?: string;
  /** Share of the element that must be visible, 0 to 1. */
  threshold?: number;
}

/**
 * True while the element is in the viewport. False during the prerender and hydration; without
 * IntersectionObserver (old browsers, jsdom) it counts as always in view, so nothing waits forever.
 */
export function useInView(
  ref: RefObject<Element | null>,
  { once = false, rootMargin = '0px', threshold = 0 }: InViewOptions = {},
): boolean {
  const hydrated = useHydrated();
  const [inView, setInView] = useState(false);
  const supported = typeof IntersectionObserver !== 'undefined';

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        setInView(visible);
        if (visible && once) observer.disconnect();
      },
      { rootMargin, threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, once, rootMargin, threshold]);

  return inView || (hydrated && !supported);
}
