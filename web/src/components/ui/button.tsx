/**
 * Button on the Base UI button primitive.
 * Source: shadcn/ui `button` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens and variants (primary, mind-b, human, secondary, ghost, outline,
 * destructive, link), the S1 sizes (md is the 44px default), filled variants with a lit top edge
 * and a lift shadow (the Instrument depth), a loading state that keeps focus and width, the
 * global focus ring instead of shadcn's ring utilities, and 24px / 44px (touch) pointer targets.
 */
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/utils/cn';

const buttonCva = cva(
  [
    'group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent font-medium whitespace-nowrap select-none hit-area',
    'transition-[background-color,border-color,color,box-shadow,scale] duration-(--dur-fast) ease-snap motion-safe:active:not-data-loading:scale-[0.97]',
    'data-disabled:not-data-loading:pointer-events-none data-disabled:not-data-loading:border-line data-disabled:not-data-loading:bg-surface-2 data-disabled:not-data-loading:bg-none data-disabled:not-data-loading:text-muted data-disabled:not-data-loading:shadow-none',
    'data-loading:cursor-progress',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Ink on cyan in dark mode (7.4:1), white on deep teal in light mode (5.9:1). The gloss is a
        // white fade from the top edge (a token: strong in dark, faint in light so text keeps its contrast).
        primary:
          'bg-mind-a bg-[linear-gradient(180deg,var(--gloss),transparent_58%)] text-on-accent shadow-lift hover:bg-[color-mix(in_oklab,var(--mind-a)_86%,var(--fg))]',
        // Mind B: ink on terracotta in dark mode (8.3:1), white on burnt terracotta in light (5.0:1).
        'mind-b':
          'bg-mind-b bg-[linear-gradient(180deg,var(--gloss),transparent_58%)] text-on-accent shadow-lift hover:bg-[color-mix(in_oklab,var(--mind-b)_86%,var(--fg))]',
        // The human accent: ink on champagne (12.9:1) in dark mode, white on bronze (6.4:1) in light.
        human:
          'bg-human bg-[linear-gradient(180deg,var(--gloss),transparent_58%)] text-on-accent shadow-lift hover:bg-[color-mix(in_oklab,var(--human)_86%,var(--fg))]',
        secondary:
          'border-line bg-surface-2 text-fg shadow-raise hover:border-line-strong hover:bg-surface-3 hover:shadow-lift aria-expanded:bg-surface-3',
        ghost:
          'text-fg-soft hover:bg-hover hover:text-fg aria-expanded:bg-hover aria-expanded:text-fg',
        outline:
          'border-line-strong text-fg hover:border-fg-soft hover:bg-hover aria-expanded:border-fg-soft aria-expanded:bg-hover',
        destructive:
          'bg-bad bg-[linear-gradient(180deg,var(--gloss),transparent_58%)] text-on-accent shadow-lift hover:bg-[color-mix(in_oklab,var(--bad)_86%,var(--fg))]',
        link: 'text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current',
      },
      size: {
        xs: "h-7 gap-1 rounded-sm px-2.5 text-caption [&_svg:not([class*='size-'])]:size-3.5",
        sm: 'h-9 gap-1.5 px-3.5 text-ui-sm',
        md: 'h-11 gap-2 px-5 text-ui',
        lg: 'h-12 gap-2.5 px-6 text-ui',
        'icon-xs': "size-7 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
        'icon-sm': 'size-9',
        icon: 'size-11',
      },
    },
    compoundVariants: [
      // A link reads as text: no box, no padding, no press scale.
      {
        variant: 'link',
        className:
          'h-auto rounded-sm border-0 px-0 shadow-none motion-safe:active:not-data-loading:scale-100',
      },
    ],
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonVariant = NonNullable<VariantProps<typeof buttonCva>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonCva>['size']>;

/**
 * The button classes for a variant and size, conflicts resolved (a variant's border colour wins
 * over the base's transparent border). Use it to style links and Base UI triggers as buttons.
 */
export function buttonVariants(options?: { variant?: ButtonVariant; size?: ButtonSize }): string {
  return cn(buttonCva(options));
}

export type ButtonProps = ButtonPrimitive.Props & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Shows a spinner and ignores presses, but stays focusable and keeps its accessible name and
   * width, so focus is never lost while an action runs.
   */
  loading?: boolean;
};

/**
 * The one button. Base UI renders a native `<button type="button">` (pass `type="submit"` for
 * forms). For a link that looks like a button, use `buttonVariants()` on an `<a>` instead.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const guardedClick = loading
    ? (event: MouseEvent<HTMLButtonElement>) => event.preventDefault()
    : onClick;

  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? '' : undefined}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      disabled={disabled}
      focusableWhenDisabled={loading}
      className={cn(buttonVariants({ variant, size }), className)}
      onClick={guardedClick}
      {...props}
    >
      {loading ? (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center">
          <LoaderCircle className="size-4 animate-spin" strokeWidth={2} />
        </span>
      ) : null}
      <span
        className={cn(
          'justify-[inherit] inline-flex min-w-0 flex-1 items-center gap-[inherit]',
          loading && 'opacity-0',
        )}
      >
        {children}
      </span>
    </ButtonPrimitive>
  );
}
