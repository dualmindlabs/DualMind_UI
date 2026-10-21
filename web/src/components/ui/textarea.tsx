/**
 * Multi-line text input.
 * Source: shadcn/ui `textarea` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens, the same look and states as <Input>, vertical resize only.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** A multi-line input, same look as <Input>. Pair it with <Field>. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-28 w-full min-w-0 resize-y rounded-sm border border-line-strong bg-surface-2 px-3.5 py-3 text-body text-fg transition-[border-color,background-color] duration-(--dur-fast) ease-out-expo placeholder:text-muted hover:border-fg-soft sm:text-ui',
        'disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:border-line',
        'read-only:bg-surface aria-invalid:border-bad aria-invalid:hover:border-bad',
        className,
      )}
      {...props}
    />
  );
}
