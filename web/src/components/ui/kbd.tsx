/**
 * Keyboard key.
 * Source: shadcn/ui `kbd` (base-vega), MIT, see ./LICENSE.md.
 * Changes: DM Mono label voice, a raised key with a thicker bottom edge, our tokens.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** One key: <Kbd>Esc</Kbd>. Screen readers read the text, so spell keys out where it helps. */
export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-6 min-w-6 items-center justify-center gap-1 rounded-[5px] border border-b-2 border-line bg-surface-2 px-1.5 font-mono text-caption leading-none font-medium text-fg-soft select-none',
        "[&_svg:not([class*='size-'])]:size-3",
        className,
      )}
      {...props}
    />
  );
}

/** A key combination: <KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup>. */
export function KbdGroup({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd-group"
      className={cn('inline-flex items-center gap-1 font-mono', className)}
      {...props}
    />
  );
}
