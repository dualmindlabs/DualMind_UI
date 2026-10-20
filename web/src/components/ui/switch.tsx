/**
 * Switch on the Base UI switch primitive (role="switch", a hidden input for forms).
 * Source: shadcn/ui `switch` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens (control border at 3:1, Mind A when on), a transform-only thumb on the
 * motion tokens, 24px / 44px (touch) targets. Label it with <Field layout="control-end">.
 */
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '@/lib/utils/cn';

export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'group/switch hit-area relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-surface-2 p-0.5 transition-[background-color,border-color] duration-(--dur-fast) ease-out-expo',
        'hover:border-fg-soft data-checked:border-mind-a data-checked:bg-mind-a',
        'aria-invalid:border-bad data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4.5 rounded-full bg-fg-soft shadow-raise transition-[translate,background-color] duration-(--dur-fast) ease-out-expo data-checked:translate-x-4 data-checked:bg-on-accent"
      />
    </SwitchPrimitive.Root>
  );
}
