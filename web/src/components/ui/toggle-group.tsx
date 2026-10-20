/**
 * A group of toggles on the Base UI toggle group primitive: arrow keys move between items; one
 * or several can be pressed (`multiple`).
 * Source: shadcn/ui `toggle-group` (base-vega), MIT, see ./LICENSE.md.
 * Changes: a joined segmented look on our tokens, variants shared with ./toggle.tsx.
 */
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { createContext, useContext } from 'react';

import { type ToggleSize, toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils/cn';

const ToggleGroupSizeContext = createContext<ToggleSize>('md');

export function ToggleGroup({
  className,
  size = 'md',
  children,
  ...props
}: ToggleGroupPrimitive.Props & { size?: ToggleSize }) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-size={size}
      className={cn(
        'inline-flex w-fit items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
        className,
      )}
      {...props}
    >
      <ToggleGroupSizeContext.Provider value={size}>{children}</ToggleGroupSizeContext.Provider>
    </ToggleGroupPrimitive>
  );
}

export function ToggleGroupItem({ className, ...props }: TogglePrimitive.Props) {
  const size = useContext(ToggleGroupSizeContext);
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        toggleVariants({ variant: 'default', size }),
        'rounded-md focus-visible:outline-offset-1',
        className,
      )}
      {...props}
    />
  );
}
