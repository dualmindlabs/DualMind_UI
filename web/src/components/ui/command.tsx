/**
 * Command menu on cmdk: a filterable list driven from a text field (combobox + listbox), for the
 * command palette and pickers such as the model selector.
 * Source: shadcn/ui `command` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our raised surface and type tokens, a Mind A marker on the selected item, a focus line
 * under the search field, group headings in the label voice, the dialog from ./dialog.tsx with a
 * real (visually hidden) title.
 */
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';

export function Command({ className, ...props }: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('flex size-full flex-col overflow-hidden bg-surface-2 text-fg', className)}
      {...props}
    />
  );
}

export type CommandDialogProps = Omit<DialogPrimitive.Root.Props, 'children'> & {
  /** Announced as the dialog's name; visually hidden. */
  title: string;
  /** Announced as the dialog's description; visually hidden. */
  description: string;
  className?: string;
  children: ReactNode;
  /** Passed to the popup: where focus goes when the dialog closes (default: back to the trigger). */
  finalFocus?: DialogPrimitive.Popup.Props['finalFocus'];
};

export function CommandDialog({
  title,
  description,
  className,
  children,
  finalFocus,
  ...props
}: CommandDialogProps) {
  return (
    <DialogPrimitive.Root data-slot="command-dialog" {...props}>
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="command-dialog-content"
          {...(finalFocus === undefined ? {} : { finalFocus })}
          className={cn(
            'fixed top-[max(1rem,12dvh)] left-1/2 z-50 flex max-h-[min(34rem,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface-2 shadow-raise-strong outline-none',
            'origin-top transition-[opacity,scale] duration-(--dur-fast) ease-out-expo data-ending-style:scale-98 data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0',
            className,
          )}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function CommandInput({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="relative flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-focus after:transition-transform after:duration-(--dur-base) after:ease-out-expo has-[input:focus-visible]:after:scale-x-100"
    >
      <Search aria-hidden="true" className="size-4.5 shrink-0 text-muted" strokeWidth={1.75} />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'h-full w-full min-w-0 bg-transparent text-body text-fg outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50 sm:text-ui',
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        'min-h-0 flex-1 scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain p-2',
        className,
      )}
      {...props}
    />
  );
}

export function CommandEmpty({ className, ...props }: ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('px-4 py-10 text-center text-ui-sm text-muted', className)}
      {...props}
    />
  );
}

export function CommandGroup({ className, ...props }: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden py-1 text-fg',
        '**:[[cmdk-group-heading]]:px-2.5 **:[[cmdk-group-heading]]:pt-2 **:[[cmdk-group-heading]]:pb-1.5 **:[[cmdk-group-heading]]:font-mono **:[[cmdk-group-heading]]:text-label **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:tracking-[0.22em] **:[[cmdk-group-heading]]:text-muted **:[[cmdk-group-heading]]:uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function CommandSeparator({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-2 my-1 h-px bg-line', className)}
      {...props}
    />
  );
}

export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'relative flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-ui-sm text-fg-soft outline-none select-none pointer-coarse:min-h-12',
        'before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-mind-a before:opacity-0 before:transition-opacity before:duration-(--dur-fast)',
        'data-[selected=true]:bg-hover data-[selected=true]:text-fg data-[selected=true]:before:opacity-100',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted data-[selected=true]:[&_svg:not([class*='text-'])]:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function CommandShortcut({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto flex items-center gap-1 text-caption text-muted', className)}
      {...props}
    />
  );
}
