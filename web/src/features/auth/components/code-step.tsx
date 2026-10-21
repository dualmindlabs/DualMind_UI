import { ArrowLeft } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { GroupField } from '@/components/ui/field';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { normalizeOtp, OTP_LENGTH, validateOtp } from '@/lib/supabase';

import { RESEND_COOLDOWN_SECONDS } from '../content/copy';
import { useCooldown } from '../hooks/use-cooldown';
import { FormStatus } from './form-status';

export interface CodeStepProps {
  /** Where the code went, as shown to the person ("name@example.com", "+91 98765 43210"). */
  destination: string;
  /** Checks the code; resolves to an error sentence, or null when it signed the person in. */
  onVerify: (code: string) => Promise<string | null>;
  /** Sends a new code; resolves to an error sentence or null. */
  onResend: () => Promise<string | null>;
  onBack: () => void;
  backLabel: string;
}

/**
 * Step two of a code sign-in: the 6-digit code (one real input drawn as slots, so paste and
 * one-time-code autofill work), checked as soon as the last digit is in, a resend link with a
 * cooldown, and a way back to change the address or number.
 */
export function CodeStep({ destination, onVerify, onResend, onBack, backLabel }: CodeStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(
    `We sent a ${OTP_LENGTH}-digit code to ${destination}. It works for a few minutes.`,
  );
  const [pending, setPending] = useState(false);
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const startCooldown = cooldown.start;

  useEffect(() => {
    inputRef.current?.focus();
    startCooldown();
  }, [startCooldown]);

  const verify = async (value: string) => {
    const problem = validateOtp(value);
    setError(problem);
    if (problem) {
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    setStatus('Checking your code');
    const failure = await onVerify(normalizeOtp(value));
    if (failure) {
      setPending(false);
      setStatus(null);
      setFormError(failure);
      setCode('');
      inputRef.current?.focus();
    } else {
      setStatus('Signed in. Taking you to the Arena');
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void verify(code);
  };

  const resend = async () => {
    setFormError(null);
    setStatus(null);
    const failure = await onResend();
    if (failure) {
      setFormError(failure);
    } else {
      setStatus(`We sent a new code to ${destination}.`);
      startCooldown();
    }
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-5">
      <GroupField label="Verification code" error={error} description={`Sent to ${destination}`}>
        {group => (
          <InputOTP
            {...group}
            ref={inputRef}
            maxLength={OTP_LENGTH}
            name="one-time-code"
            value={code}
            disabled={pending}
            onChange={value => {
              setCode(value);
              if (error) setError(null);
            }}
            onComplete={(value: string) => void verify(value)}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        )}
      </GroupField>
      <FormStatus error={formError} status={status} />
      <Button type="submit" className="w-full" loading={pending}>
        Verify and sign in
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-ui-sm">
        <Button variant="ghost" size="md" className="-ml-3" onClick={onBack} disabled={pending}>
          <ArrowLeft aria-hidden="true" />
          {backLabel}
        </Button>
        <Button
          variant="link"
          className="min-h-11"
          disabled={pending || cooldown.remaining > 0}
          onClick={() => void resend()}
        >
          {cooldown.remaining > 0 ? `Resend in ${cooldown.remaining} s` : 'Send a new code'}
        </Button>
      </div>
    </form>
  );
}
