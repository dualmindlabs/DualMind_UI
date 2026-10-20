import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

import { useHydrated } from '@/hooks/use-hydrated';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait after the element enters the viewport, for small staggers. */
  delay?: number;
}

/** static: visible, never animated. hidden: waiting below the fold. shown: entered. */
type RevealState = 'static' | 'hidden' | 'shown';

/**
 * In-view entrance: fades and lifts content in the first time it scrolls into view (opacity and
 * transform only, --dur-slow, --ease-out-expo). The prerendered HTML stays visible: content is
 * only hidden after hydration, when it is still below the fold, so nothing depends on JavaScript
 * and nothing that is already on screen flashes. Off under reduced motion.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const reduce = useShouldReduceMotion();
  const [state, setState] = useState<RevealState>('static');

  useEffect(() => {
    const element = ref.current;
    if (!hydrated || reduce || !element || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    let first = true;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      if (first) {
        first = false;
        if (visible) {
          observer.disconnect();
          return;
        }
        setState(current => (current === 'static' ? 'hidden' : current));
        return;
      }
      if (visible) {
        setState(current => (current === 'hidden' ? 'shown' : current));
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hydrated, reduce]);

  const style: CSSProperties | undefined =
    state === 'shown' && delay > 0 ? { transitionDelay: `${delay}s` } : undefined;

  return (
    <div
      ref={ref}
      data-reveal={state}
      style={style}
      className={cn(
        state === 'hidden' && !reduce && 'translate-y-4 opacity-0',
        state === 'shown' &&
          'transition-[opacity,transform] duration-(--dur-slow) ease-out-expo motion-reduce:transition-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
