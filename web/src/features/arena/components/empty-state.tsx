import type { RefObject } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';

import { useArena } from '../hooks/use-arena';
import { MODE_DETAILS } from '../lib/modes';
import { DuelEmblem } from './duel-emblem';

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
    <div className="grid justify-items-center gap-4 text-center sm:gap-5">
      <DuelEmblem className="max-sm:hidden" />
      <p className="flex items-center gap-2.5 eyebrow text-fg-soft">
        {mode === 'direct' ? null : (
          <span className="flex items-center gap-1" aria-hidden="true">
            <RoleBadge who="a" letterOnly size="sm" />
            <RoleBadge who="b" letterOnly size="sm" />
          </span>
        )}
        {details.eyebrow}
      </p>
      <h1 ref={headingRef} className="max-w-4xl text-h1 text-balance text-fg">
        {details.heading.plain}{' '}
        <span className="block human-voice text-human">{details.heading.human}</span>
      </h1>
      <p className="max-w-xl text-ui text-fg-soft sm:text-lead">{details.lead}</p>
    </div>
  );
}
