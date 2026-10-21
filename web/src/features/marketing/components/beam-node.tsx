import type { ReactNode, RefObject } from 'react';

import { cn } from '@/lib/utils/cn';

interface BeamNodeProps {
  children: ReactNode;
  label: string;
  nodeRef: RefObject<HTMLDivElement | null>;
  tone: 'human' | 'a' | 'b';
}

/** A stop on the battle diagram: a round node (the beams attach to it) with a label under it. */
export function BeamNode({ children, label, nodeRef, tone }: BeamNodeProps) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        ref={nodeRef}
        className={cn(
          'relative z-10 grid size-12 place-items-center rounded-full border bg-surface-2 shadow-raise sm:size-14',
          tone === 'human' && 'border-human/50',
          tone === 'a' && 'border-mind-a/45',
          tone === 'b' && 'border-mind-b/55',
        )}
      >
        {children}
      </div>
      <span className="eyebrow text-muted">{label}</span>
    </div>
  );
}
