/**
 * Toggle button on the Base UI toggle primitive (aria-pressed).
 * Source: shadcn/ui `toggle` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens, a Mind A accent line for the pressed state (not colour alone: the pressed
 * toggle also gets a raised surface), 24px / 44px (touch) targets.
 */
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils/cn';

export const toggleVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent font-medium whitespace-nowrap text-fg-soft transition-[background-color,border-color,color] duration-(--dur-fast) ease-out-expo select-none hit-area',
    'hover:bg-hover hover:text-fg data-disabled:pointer-events-none data-disabled:opacity-50',
    'data-pressed:border-line-strong data-pressed:bg-surface-2 data-pressed:text-fg data-pressed:shadow-raise',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: '',
        outline: 'border-line',
      },
      size: {
        sm: 'h-8 min-w-8 px-2.5 text-ui-sm',
        md: 'h-9 min-w-9 px-3 text-ui-sm',
        lg: 'h-11 min-w-11 px-4 text-ui',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type ToggleVariant = NonNullable<VariantProps<typeof toggleVariants>['variant']>;
export type ToggleSize = NonNullable<VariantProps<typeof toggleVariants>['size']>;

export function Toggle({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: TogglePrimitive.Props & { variant?: ToggleVariant; size?: ToggleSize }) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}
