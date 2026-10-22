/**
 * Card: a surface for grouped content.
 * Source: shadcn/ui `card` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our surface, hairline and depth tokens, the 14px card radius, an h3 title by default.
 * Surfaces: `flat` (default, one raise shadow), `duel` (lit gradient and lift shadow), `a` and `b`
 * (tinted for Mind A or B, with a 2px top rule) and `float` (menus, docks). The depth utilities
 * live in styles/surfaces.css.
 */
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export type CardSurface = 'flat' | 'duel' | 'a' | 'b' | 'float';

const surfaceClass: Record<CardSurface, string> = {
  flat: 'rounded-lg border border-line bg-surface shadow-raise',
  duel: 'surface-duel',
  a: 'surface-a',
  b: 'surface-b',
  float: 'surface-float',
};

export function Card({
  className,
  size = 'md',
  surface = 'flat',
  ...props
}: ComponentProps<'div'> & { size?: 'sm' | 'md'; surface?: CardSurface }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-surface={surface}
      className={cn(
        'group/card flex flex-col gap-(--card-gap) py-(--card-gap) text-ui-sm text-fg-soft',
        surfaceClass[surface],
        '[--card-gap:--spacing(6)] data-[size=sm]:[--card-gap:--spacing(4)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min items-start gap-1 px-(--card-gap) has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, children, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-h3 font-semibold text-fg group-data-[size=sm]/card:text-ui', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p data-slot="card-description" className={cn('text-ui-sm text-muted', className)} {...props} />
  );
}

export function CardAction({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-(--card-gap)', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-3 px-(--card-gap)', className)}
      {...props}
    />
  );
}
