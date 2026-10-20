/**
 * Tabs on the Base UI tabs primitive, with a sliding indicator (the mode switch look).
 * Source: shadcn/ui `tabs` (base-vega), MIT, see ./LICENSE.md.
 * Changes: Base UI's Tabs.Indicator instead of per-tab backgrounds (it slides with transform;
 * instant under reduced motion), two variants (`segment` pill and `line` underline), our tokens,
 * 36px tabs (44px on touch screens).
 */
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { createContext, useContext } from 'react';

import { cn } from '@/lib/utils/cn';

type TabsVariant = 'segment' | 'line';

const TabsVariantContext = createContext<TabsVariant>('segment');

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn(
        'flex gap-4 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:flex-row',
        className,
      )}
      {...props}
    />
  );
}

export function TabsList({
  className,
  variant = 'segment',
  children,
  ...props
}: TabsPrimitive.List.Props & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          'relative isolate inline-flex w-fit max-w-full items-center data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
          variant === 'segment' && 'gap-0.5 rounded-full border border-line bg-surface p-1',
          variant === 'line' && 'gap-1 border-b border-line',
          className,
        )}
        {...props}
      >
        {children}
        <TabsPrimitive.Indicator
          data-slot="tabs-indicator"
          className={cn(
            'absolute -z-10 transition-[translate,width,height] duration-(--dur-base) ease-out-expo',
            variant === 'segment' &&
              'top-(--active-tab-top) left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-surface-2 shadow-raise ring-1 ring-line',
            variant === 'line' &&
              'bottom-0 left-0 h-0.5 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-full bg-mind-a',
          )}
        />
      </TabsPrimitive.List>
    </TabsVariantContext.Provider>
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  const variant = useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'relative inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 px-3.5 text-ui-sm font-medium whitespace-nowrap text-muted transition-colors duration-(--dur-fast) ease-out-expo select-none pointer-coarse:h-11',
        'hover:text-fg data-active:text-fg data-disabled:pointer-events-none data-disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        variant === 'segment' &&
          'h-8 rounded-full focus-visible:outline-offset-1 pointer-coarse:h-10',
        variant === 'line' && 'rounded-sm',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn('min-w-0 flex-1 text-ui-sm text-fg-soft', className)}
      {...props}
    />
  );
}
