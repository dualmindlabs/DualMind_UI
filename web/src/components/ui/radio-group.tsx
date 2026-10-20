/**
 * Radio group on the Base UI radio group primitive: arrow keys move and select.
 * Source: shadcn/ui `radio-group` (base-vega), MIT, see ./LICENSE.md.
 * Changes: our tokens (control border at 3:1, Mind A when chosen), 20px radios with 24px / 44px
 * (touch) targets. Name the group with <GroupField>, each radio with <Field layout="control-start">.
 */
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';

import { cn } from '@/lib/utils/cn';

export function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid w-full gap-3', className)}
      {...props}
    />
  );
}

export function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'peer relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-strong bg-surface-2 transition-[border-color] duration-(--dur-fast) ease-out-expo hit-area',
        'hover:border-fg-soft data-checked:border-mind-a',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-bad',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="block size-2.5 rounded-full bg-mind-a transition-[scale] duration-(--dur-fast) ease-out-expo data-starting-style:scale-0"
      />
    </RadioPrimitive.Root>
  );
}
