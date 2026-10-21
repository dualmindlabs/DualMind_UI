import type { RefObject } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';

import { useArena } from '../hooks/use-arena';
import { MODE_DETAILS } from '../lib/modes';

/**
 * The empty arena's heading: the mode's eyebrow (with the A and B marks in a battle), one line
 * with a single human-voice phrase, and what happens next. Quiet on purpose: the signature
 * moment of this screen is the reveal, not the welcome.
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
    <div className="grid justify-items-center gap-4 text-center">
      <p className="flex items-center gap-2.5 eyebrow text-muted">
        {mode === 'direct' ? null : (
          <span className="flex items-center gap-1" aria-hidden="true">
            <RoleBadge who="a" letterOnly size="sm" />
            <RoleBadge who="b" letterOnly size="sm" />
          </span>
        )}
        {details.eyebrow}
      </p>
      <h1 ref={headingRef} className="text-h1 font-light tracking-tight text-fg">
        {details.heading.plain}{' '}
        <span className="human-voice text-human">{details.heading.human}</span>
      </h1>
      <p className="max-w-xl text-ui text-fg-soft sm:text-body">{details.lead}</p>
    </div>
  );
}
