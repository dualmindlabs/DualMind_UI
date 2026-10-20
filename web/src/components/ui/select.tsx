/**
 * Select on the Base UI select primitive: a listbox with typeahead and a hidden form input.
 * Source: shadcn/ui `select` (base-vega), MIT, see ./LICENSE.md.
 * Changes: a trigger that matches <Input> (44px, control border), the shared raised surface and
 * motion, the popup opens below the trigger (no item alignment), our tokens and Lucide icons.
 */
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { menuItem, popupMotion, popupSurface } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/cn';

export const Select = SelectPrimitive.Root;

export function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group data-slot="select-group" className={cn('py-1', className)} {...props} />
  );
}

export function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex min-w-0 flex-1 truncate text-left data-placeholder:text-muted', className)}
      {...props}
    />
  );
}

export function SelectTrigger({
  className,
  size = 'md',
  children,
  ...props
}: SelectPrimitive.Trigger.Props & { size?: 'sm' | 'md' }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        'relative flex w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-sm border border-line-strong bg-surface-2 pr-3 pl-3.5 text-left text-body whitespace-nowrap text-fg transition-[border-color,background-color] duration-(--dur-fast) ease-out-expo select-none hover:border-fg-soft sm:text-ui',
        'data-popup-open:border-fg-soft data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:text-muted aria-invalid:border-bad',
        'data-[size=md]:h-11 data-[size=sm]:h-9 data-[size=sm]:text-ui-sm',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        className="text-muted transition-transform duration-(--dur-fast) ease-out-expo in-data-popup-open:rotate-180"
        render={<ChevronDown aria-hidden="true" strokeWidth={1.75} />}
      />
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  alignOffset = 0,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            popupSurface,
            popupMotion,
            'relative max-h-(--available-height) min-w-(--anchor-width) overflow-hidden',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.ScrollUpArrow className="absolute inset-x-0 top-0 z-10 flex h-6 cursor-default items-center justify-center rounded-t-lg bg-surface-2 text-muted">
            <ChevronUp aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </SelectPrimitive.ScrollUpArrow>
          <SelectPrimitive.List className="max-h-[min(var(--available-height),20rem)] scroll-py-1.5 overflow-y-auto p-1.5">
            {children}
          </SelectPrimitive.List>
          <SelectPrimitive.ScrollDownArrow className="absolute inset-x-0 bottom-0 z-10 flex h-6 cursor-default items-center justify-center rounded-b-lg bg-surface-2 text-muted">
            <ChevronDown aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </SelectPrimitive.ScrollDownArrow>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

export function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn('eyebrow px-2.5 pt-2 pb-1.5 text-muted', className)}
      {...props}
    />
  );
}

export function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(menuItem, 'w-full pr-9 data-selected:text-fg', className)}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex min-w-0 flex-1 items-center gap-2 truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center" />
        }
      >
        <Check aria-hidden="true" className="size-4 text-mind-a" strokeWidth={2.25} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn('-mx-1.5 my-1.5 h-px bg-line', className)}
      {...props}
    />
  );
}
