import { useEffect, useRef } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

import { EXPO, playOn } from './stage-motion';

/**
 * Two overlapping rings, Mind A and Mind B, and the lens where they meet: the arena in one
 * mark. The rings slide together once when it mounts (transform only, still under reduced
 * motion). Decorative.
 */
export function DuelEmblem({ className }: { className?: string }) {
  const reduce = useShouldReduceMotion();
  const a = useRef<SVGGElement | null>(null);
  const b = useRef<SVGGElement | null>(null);
  const lens = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (reduce) return;
    const plays = [
      playOn(a.current, [{ transform: 'translateX(-14px)' }, { transform: 'translateX(0)' }], {
        duration: 900,
        easing: EXPO,
        fill: 'both',
      }),
      playOn(b.current, [{ transform: 'translateX(14px)' }, { transform: 'translateX(0)' }], {
        duration: 900,
        easing: EXPO,
        fill: 'both',
      }),
      playOn(lens.current, [{ opacity: 0 }, { opacity: 1 }], {
        duration: 500,
        delay: 450,
        easing: EXPO,
        fill: 'both',
      }),
    ];
    return () => {
      for (const play of plays) play?.cancel();
    };
  }, [reduce]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 68 64"
      className={cn('size-16 overflow-visible', className)}
    >
      <g ref={a}>
        <circle cx="24" cy="32" r="16" className="fill-mind-a/15 stroke-mind-a" strokeWidth="2" />
      </g>
      <g ref={b}>
        <circle cx="44" cy="32" r="16" className="fill-mind-b/15 stroke-mind-b" strokeWidth="2" />
      </g>
      <path
        ref={lens}
        d="M34 19.5 A16 16 0 0 1 34 44.5 A16 16 0 0 1 34 19.5 Z"
        className="fill-fg"
      />
    </svg>
  );
}
