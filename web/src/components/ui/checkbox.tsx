/**
 * Checkbox on the Base UI checkbox primitive (a hidden input for forms, indeterminate state).
 * Source: shadcn/ui `checkbox` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens (control border at 3:1, Mind A when ticked), a 20px box with 24px / 44px
 * (touch) targets, Lucide icons. Label it with <Field layout="control-start">.
 */
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check, Minus } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

export function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer hit-area relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[5px] border border-line-strong bg-surface-2 text-on-accent transition-[background-color,border-color] duration-(--dur-fast) ease-out-expo',
        'hover:border-fg-soft data-checked:border-mind-a data-checked:bg-mind-a data-indeterminate:border-mind-a data-indeterminate:bg-mind-a',
        'aria-invalid:border-bad data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="group/indicator grid place-content-center text-current"
      >
        <Check
          aria-hidden="true"
          className="size-3.5 group-data-indeterminate/indicator:hidden"
          strokeWidth={3}
        />
        <Minus
          aria-hidden="true"
          className="hidden size-3.5 group-data-indeterminate/indicator:block"
          strokeWidth={3}
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
