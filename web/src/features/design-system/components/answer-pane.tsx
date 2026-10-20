import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils/cn';

import { roleStyles } from '../lib/roles';
import type { Role } from '../types';
import { MindBadge } from './mind-badge';

interface AnswerPaneProps {
  role: Exclude<Role, 'human'>;
  meta: string;
  children: ReactNode;
}

/** One side of a battle: a labelled region with an A/B header on a 10% role tint. */
export function AnswerPane({ role, meta, children }: AnswerPaneProps) {
  const headingId = useId();
  const style = roleStyles[role];

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface-2 shadow-raise"
    >
      <header
        className={cn(
          'flex items-center justify-between gap-3 border-b border-line px-4 py-3',
          style.tint,
        )}
      >
        <div className="flex items-center gap-2.5">
          <MindBadge role={role} />
          <h4 id={headingId} className={cn('text-ui font-semibold', style.text)}>
            Answer {style.letter}
          </h4>
        </div>
        <p className="font-mono text-caption text-muted tabular-nums">{meta}</p>
      </header>
      <div className="max-w-[72ch] space-y-3 px-4 py-4 text-body text-fg">{children}</div>
    </section>
  );
}
