/**
 * Tooltip on the Base UI tooltip primitive: shows on hover and keyboard focus, Esc hides it.
 * Source: shadcn/ui `tooltip` (base-vega), MIT, see ./LICENSE.md.
 * Changes: a quiet raised surface instead of an inverted one, our type tokens, room for <Kbd>
 * shortcut hints, the motion tokens. Tooltips only repeat what the trigger's name says; never
 * put the only label of a control in one.
 */
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils/cn';

/** Mounted once in the root: tooltips share one open delay, and skip it when moving between. */
export function TooltipProvider({ delay = 400, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />;
}

export function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

export function TooltipTrigger(props: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

export function TooltipContent({
  className,
  side = 'top',
  sideOffset = 8,
  align = 'center',
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 py-1.5 text-caption text-fg shadow-raise-strong',
            'transition-[opacity,scale] duration-(--dur-fast) ease-out-expo data-ending-style:scale-96 data-ending-style:opacity-0 data-instant:duration-0 data-starting-style:scale-96 data-starting-style:opacity-0',
            '[&_[data-slot=kbd]]:h-5 [&_[data-slot=kbd]]:min-w-5 [&_[data-slot=kbd]]:text-[0.75rem]',
            className,
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}
