/**
 * One-time code input on input-otp: one real <input> (announced as one field, autofill with
 * autocomplete="one-time-code", paste works) drawn as separate slots.
 * Source: shadcn/ui `input-otp` (base-vega), MIT, see ./LICENSE.md.
 * Changes: 44px slots on our control tokens, the focus ring on the active slot, the code font,
 * a caret that stops blinking under reduced motion.
 */
import { OTPInput, OTPInputContext } from 'input-otp';
import { type ComponentProps, useContext } from 'react';

import { cn } from '@/lib/utils/cn';

export function InputOTP({
  className,
  containerClassName,
  ...props
}: ComponentProps<typeof OTPInput>) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        'group/otp flex w-full max-w-sm items-center gap-2 has-disabled:opacity-50',
        containerClassName,
      )}
      spellCheck={false}
      autoComplete="one-time-code"
      inputMode="numeric"
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

export function InputOTPGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn('flex min-w-0 flex-1 items-center gap-1.5', className)}
      {...props}
    />
  );
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: ComponentProps<'div'> & { index: number }) {
  const context = useContext(OTPInputContext);
  const slot = context.slots[index];
  const isActive = slot?.isActive ?? false;

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        'relative flex h-12 max-w-11 min-w-0 flex-1 items-center justify-center rounded-sm border border-line-strong bg-surface-2 font-code text-h3 text-fg transition-[border-color] duration-(--dur-fast) ease-out-expo',
        'data-[active=true]:z-10 data-[active=true]:border-focus data-[active=true]:outline-(length:--focus-width) data-[active=true]:outline-offset-2 data-[active=true]:outline-focus data-[active=true]:outline-solid',
        'group-has-[input[aria-invalid=true]]/otp:border-bad',
        className,
      )}
      {...props}
    >
      {slot?.char ?? (
        <span aria-hidden="true" className="text-muted">
          {slot?.placeholderChar}
        </span>
      )}
      {slot?.hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret bg-fg" />
        </div>
      ) : null}
    </div>
  );
}

export function InputOTPSeparator(props: ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-otp-separator"
      aria-hidden="true"
      className="shrink-0 px-0.5 text-muted"
      {...props}
    >
      <span className="block h-px w-3 bg-line-strong" />
    </div>
  );
}
