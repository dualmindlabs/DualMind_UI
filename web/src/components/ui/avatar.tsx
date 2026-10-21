/**
 * Avatar on the Base UI avatar primitive: the image, or initials while it loads or if it fails.
 * Source: shadcn/ui `avatar` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens, initials in the label voice, a status dot part.
 */
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils/cn';

export function Avatar({
  className,
  size = 'md',
  ...props
}: AvatarPrimitive.Root.Props & { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative inline-flex shrink-0 rounded-full bg-surface-2 ring-1 ring-line select-none',
        'data-[size=lg]:size-12 data-[size=md]:size-9 data-[size=sm]:size-7',
        className,
      )}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full rounded-full object-cover', className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full font-mono text-caption font-medium text-fg-soft uppercase group-data-[size=lg]/avatar:text-ui',
        className,
      )}
      {...props}
    />
  );
}

/** A small dot on the avatar's edge (online, provisional...). Pair it with text elsewhere. */
export function AvatarBadge({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar-badge"
      aria-hidden="true"
      className={cn(
        'absolute right-0 bottom-0 z-10 size-2.5 rounded-full bg-ok ring-2 ring-bg group-data-[size=lg]/avatar:size-3',
        className,
      )}
      {...props}
    />
  );
}

export function AvatarGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-bg',
        className,
      )}
      {...props}
    />
  );
}
