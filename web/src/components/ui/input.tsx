import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

/** A text input on the control-border token. Pair it with <Field> for the label and messages. */
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-11 w-full min-w-0 rounded-sm border border-line-strong bg-surface-2 px-3.5 text-ui text-fg transition-colors duration-(--dur-fast) ease-out-expo placeholder:text-muted hover:border-fg-soft',
        'disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-bad',
        className,
      )}
      {...props}
    />
  );
}
