import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** A multi-line input, same look as <Input>. Pair it with <Field>. */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full min-w-0 resize-y rounded-sm border border-line-strong bg-surface-2 px-3.5 py-3 text-ui text-fg transition-colors duration-(--dur-fast) ease-out-expo placeholder:text-muted hover:border-fg-soft',
        'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-bad',
        className,
      )}
      {...props}
    />
  );
}
