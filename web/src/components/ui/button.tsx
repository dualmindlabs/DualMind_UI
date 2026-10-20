import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export type ButtonVariant = 'primary' | 'terra' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const variants: Record<ButtonVariant, string> = {
  // Ink on cyan in dark mode (11.6:1), white on deep cyan in light mode (5.4:1).
  primary:
    'bg-mind-a text-on-accent shadow-raise hover:bg-[color-mix(in_oklab,var(--mind-a)_86%,var(--fg))]',
  // The human accent: ink on terra in dark mode (7.4:1), white on burnt terra in light mode (5.7:1).
  terra:
    'bg-human text-on-accent shadow-raise hover:bg-[color-mix(in_oklab,var(--human)_86%,var(--fg))]',
  ghost: 'border border-line-strong text-fg hover:border-fg-soft hover:bg-surface-2',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3.5 text-ui-sm',
  md: 'h-11 gap-2 px-5 text-ui',
};

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The S1 button. Slice S2 swaps in the shadcn/ui (Base UI) primitive with the same variant names,
 * so call sites stay the same.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] duration-(--dur-fast) ease-out-expo select-none active:scale-[0.98]',
        'disabled:pointer-events-none disabled:border disabled:border-line disabled:bg-surface-2 disabled:text-muted disabled:shadow-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
