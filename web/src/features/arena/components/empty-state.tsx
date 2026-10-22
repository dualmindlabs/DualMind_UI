import type { RefObject } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';

import { useArena } from '../hooks/use-arena';
import { MODE_DETAILS } from '../lib/modes';

/**
 * The empty arena's heading: the duel mark, the mode's eyebrow (with the A and B marks in a
 * battle), the headline at display weight with its one human-voice phrase on its own line, and
 * what happens next. The prompt box right under it is the hero of the screen.
 */
export function EmptyState({
  headingRef,
}: {
  /** The heading, for the model pickers: their lists never cover it. */
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const { mode } = useArena();
  const details = MODE_DETAILS[mode];

  return (
    <div className="grid gap-3 text-left">
      <p className="flex items-center gap-2.5 font-mono text-caption font-medium text-fg-soft">
        {mode === 'direct' ? null : (
          <span className="flex items-center gap-1" aria-hidden="true">
            <RoleBadge who="a" letterOnly size="sm" />
            <RoleBadge who="b" letterOnly size="sm" />
          </span>
        )}
        {details.eyebrow}
      </p>
      <h1 ref={headingRef} className="max-w-2xl text-h2 text-balance text-fg">
        {details.heading.plain} <span className="block text-fg-soft">{details.heading.human}</span>
      </h1>
      <p className="max-w-xl text-ui text-fg-soft">{details.lead}</p>
    </div>
  );
}
