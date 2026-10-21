/**
 * Form label.
 * Source: shadcn/ui `label` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our type scale and tokens.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** A real <label>: point it at a control with `htmlFor`, or wrap the control in it. */
export function Label({ className, htmlFor, ...props }: ComponentProps<'label'>) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'inline-flex items-center gap-2 text-ui-sm leading-snug font-medium text-fg select-none',
        'peer-data-disabled:cursor-not-allowed peer-data-disabled:text-muted',
        className,
      )}
      {...props}
    />
  );
}
