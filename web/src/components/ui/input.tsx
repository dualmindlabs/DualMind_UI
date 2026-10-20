/**
 * Text input.
 * Source: shadcn/ui `input` (base-vega), MIT, see ./LICENSE.md.
 * Changes: a native <input> (labels and messages come from <Field>), our tokens, 44px height,
 * 16px text on phones so iOS does not zoom, the global focus ring.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** A text input on the control-border token. Pair it with <Field> for the label and messages. */
export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-sm border border-line-strong bg-surface-2 px-3.5 text-body text-fg transition-[border-color,background-color] duration-(--dur-fast) ease-out-expo placeholder:text-muted hover:border-fg-soft sm:text-ui',
        'file:mr-3 file:h-full file:border-0 file:bg-transparent file:text-ui-sm file:font-medium file:text-fg',
        'disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:border-line',
        'read-only:bg-surface aria-invalid:border-bad aria-invalid:hover:border-bad',
        className,
      )}
      {...props}
    />
  );
}
