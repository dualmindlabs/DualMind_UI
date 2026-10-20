/**
 * Sheet: a dialog that slides in from an edge (detail panels, filters on desktop).
 * Source: shadcn/ui `sheet` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens, a full-edge slide on the motion tokens (instant under reduced motion),
 * the shared corner close button from ./dialog.tsx.
 */
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type { ComponentProps } from 'react';

import { DialogCornerClose, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

export function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

export type SheetSide = 'top' | 'right' | 'bottom' | 'left';

export function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & { side?: SheetSide; showCloseButton?: boolean }) {
  return (
    <SheetPrimitive.Portal>
      <DialogOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          'fixed z-50 flex flex-col gap-5 overflow-y-auto overscroll-contain bg-surface-2 text-ui-sm text-fg-soft shadow-raise-strong outline-none',
          'transition-[translate,opacity] duration-(--dur-slow) ease-out-expo data-ending-style:opacity-0 data-ending-style:duration-(--dur-base)',
          'data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:w-[min(100%_-_3rem,26rem)] data-[side=right]:border-l data-[side=right]:border-line data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full',
          'data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:w-[min(100%_-_3rem,26rem)] data-[side=left]:border-r data-[side=left]:border-line data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full',
          'data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:max-h-[85dvh] data-[side=top]:border-b data-[side=top]:border-line data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full',
          'data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:max-h-[85dvh] data-[side=bottom]:rounded-t-xl data-[side=bottom]:border-t data-[side=bottom]:border-line data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? <DialogCornerClose /> : null}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('grid gap-1.5 p-6 pr-14 pb-0', className)} {...props} />
  );
}

export function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-body" className={cn('grid gap-4 px-6', className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-6 pt-0 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-h3 font-semibold text-fg', className)}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-ui-sm text-muted', className)}
      {...props}
    />
  );
}
