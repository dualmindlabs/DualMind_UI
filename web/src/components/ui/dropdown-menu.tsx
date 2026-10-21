/**
 * Dropdown menu on the Base UI menu primitive: arrow keys, typeahead, Esc, focus return.
 * Source: shadcn/ui `dropdown-menu` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our raised surface and tokens, a scale and fade on the motion tokens, an inset focus
 * ring for keyboard focus, 36px items (44px on touch screens), Lucide icons.
 */
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Check, ChevronRight } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

/** Shared by menus, selects and the command palette: the floating raised surface. */
export const popupSurface =
  'rounded-lg border border-line bg-surface-2 text-fg shadow-raise-strong outline-none';

/** Fade and scale from the trigger, on the motion tokens; instant under reduced motion. */
export const popupMotion =
  'origin-(--transform-origin) transition-[opacity,scale] duration-(--dur-fast) ease-out-expo data-ending-style:scale-96 data-ending-style:opacity-0 data-starting-style:scale-96 data-starting-style:opacity-0';

/** An item in a menu or list: highlighted on hover and arrow keys, ring on keyboard focus. */
export const menuItem = [
  'relative flex min-h-9 cursor-default items-center gap-2.5 rounded-md px-2.5 py-1.5 text-ui-sm text-fg-soft select-none pointer-coarse:min-h-11',
  // Keyboard focus keeps the global ring, drawn inside the item so the popup does not clip it.
  'focus:outline-none focus-visible:outline-(length:--focus-width) focus-visible:-outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid',
  'data-highlighted:bg-hover data-highlighted:text-fg data-disabled:pointer-events-none data-disabled:opacity-50',
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted",
].join(' ');

export function DropdownMenu(props: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

export function DropdownMenuTrigger(props: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

export function DropdownMenuContent({
  align = 'start',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 6,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            popupSurface,
            popupMotion,
            'max-h-(--available-height) min-w-48 overflow-x-hidden overflow-y-auto p-1.5',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuGroup(props: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

export function DropdownMenuLabel({ className, ...props }: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn('px-2.5 pt-2 pb-1.5 eyebrow text-muted', className)}
      {...props}
    />
  );
}

export function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: MenuPrimitive.Item.Props & { variant?: 'default' | 'destructive' }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        menuItem,
        'data-[variant=destructive]:text-bad data-[variant=destructive]:data-highlighted:text-bad data-[variant=destructive]:[&_svg]:text-bad',
        className,
      )}
      {...props}
    />
  );
}

/** A menu item that navigates: renders an <a>, keeps link semantics for middle-click and copy. */
export function DropdownMenuLinkItem({
  className,
  href,
  children,
  ...props
}: Omit<MenuPrimitive.Item.Props, 'render'> & { href: string }) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(menuItem, className)}
      render={<a href={href}>{children}</a>}
      {...props}
    />
  );
}

export function DropdownMenuSub(props: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

export function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(menuItem, 'data-popup-open:bg-hover data-popup-open:text-fg', className)}
      {...props}
    >
      {children}
      <ChevronRight aria-hidden="true" className="ml-auto" strokeWidth={1.75} />
    </MenuPrimitive.SubmenuTrigger>
  );
}

export function DropdownMenuSubContent({
  align = 'start',
  alignOffset = -6,
  side = 'right',
  sideOffset = 2,
  ...props
}: ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function ItemIndicator({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-2.5 flex size-4 items-center justify-center text-mind-a"
    >
      {children}
    </span>
  );
}

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(menuItem, 'pr-9', className)}
      {...props}
    >
      <ItemIndicator>
        <MenuPrimitive.CheckboxItemIndicator>
          <Check className="size-4 text-mind-a" strokeWidth={2.25} />
        </MenuPrimitive.CheckboxItemIndicator>
      </ItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioGroup(props: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuItem, 'pr-9', className)}
      {...props}
    >
      <ItemIndicator>
        <MenuPrimitive.RadioItemIndicator>
          <span className="block size-2 rounded-full bg-mind-a" />
        </MenuPrimitive.RadioItemIndicator>
      </ItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

export function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1.5 my-1.5 h-px bg-line', className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ml-auto font-mono text-caption tracking-wider text-muted', className)}
      {...props}
    />
  );
}
