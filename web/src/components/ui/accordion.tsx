/**
 * Accordion on the Base UI accordion primitive (FAQ, settings sections).
 * Source: shadcn/ui `accordion` (base-vega), MIT, see ./LICENSE.md.
 * Changes: one rotating chevron, our type and line tokens, the panel height transition on the
 * motion tokens (instant under reduced motion), 48px triggers.
 */
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  );
}

export function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-line', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex min-h-12 flex-1 cursor-pointer items-center justify-between gap-4 rounded-sm py-3 text-left text-ui font-medium text-fg transition-colors duration-(--dur-fast) ease-out-expo hover:text-mind-a',
          'data-disabled:pointer-events-none data-disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.75}
          className="size-4 shrink-0 text-muted transition-transform duration-(--dur-base) ease-out-expo group-data-panel-open/accordion-trigger:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="h-(--accordion-panel-height) overflow-hidden text-ui-sm text-fg-soft transition-[height] duration-(--dur-base) ease-out-expo data-ending-style:h-0 data-starting-style:h-0"
      {...props}
    >
      <div className={cn('pb-4 [&_p:not(:last-child)]:mb-3', className)}>{children}</div>
    </AccordionPrimitive.Panel>
  );
}
