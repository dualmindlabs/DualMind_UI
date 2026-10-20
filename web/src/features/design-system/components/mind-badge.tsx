import { cn } from '@/lib/utils/cn';

import { roleStyles } from '../lib/roles';
import type { Role } from '../types';

/**
 * The A / B letter that goes with every model colour (colour is never the only signal).
 * Decorative next to a visible label such as "Answer A".
 */
export function MindBadge({ role, className }: { role: Exclude<Role, 'human'>; className?: string }) {
  const style = roleStyles[role];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid size-6 shrink-0 place-items-center rounded-sm border font-mono text-ui-sm font-medium',
        style.tint,
        style.text,
        style.border,
        className,
      )}
    >
      {style.letter}
    </span>
  );
}
