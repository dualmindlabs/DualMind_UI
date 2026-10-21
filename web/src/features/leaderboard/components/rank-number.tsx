import { useEffect, useState } from 'react';

import { SlidingNumber } from '@/components/vendor/motion-primitives/sliding-number';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface RankNumberProps {
  rank: number;
  className?: string;
}

/**
 * A rank on the timing board, always two digits ("01"). Its digits roll from 00 into place the
 * first time it appears (the board's signature moment) and roll again when a refresh moves the
 * model; with reduced motion it is plain text. Screen readers hear the number once.
 */
export function RankNumber({ rank, className }: RankNumberProps) {
  const reduce = useShouldReduceMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    // One frame at 00 first, so the spring has somewhere to come from.
    const frame = requestAnimationFrame(() => setShown(rank));
    return () => cancelAnimationFrame(frame);
  }, [rank]);

  return (
    <span className={cn('font-mono tabular-nums', className)}>
      <SlidingNumber value={reduce ? rank : shown} padStart />
    </span>
  );
}
