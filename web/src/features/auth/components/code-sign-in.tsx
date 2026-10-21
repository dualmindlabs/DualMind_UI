import type { Session } from '@supabase/supabase-js';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import {
  AUTH_CALLBACK_PATH,
  authErrorMessage,
  normalizeEmail,
  normalizePhone,
  validateEmail,
  validatePhone,
} from '@/lib/supabase';

import { CodeStep } from './code-step';
import { FormStatus } from './form-status';

export type CodeChannel = 'email' | 'phone';

const COPY: Record<CodeChannel, { label: string; send: string; back: string; hint: string }> = {
  email: {
    label: 'Email',
    send: 'Email me a code',
    back: 'Use a different email',
    hint: 'We email you a 6-digit code (and a link). No password needed.',
  },
  phone: {
    label: 'Phone number',
    send: 'Text me a code',
    back: 'Use a different number',
    hint: 'With the country code, for example +91 98765 43210. Ten digits without one count as an Indian (+91) number.',
  },
};

/** A phone number for display: +91 98765 43210 style for Indian numbers, else as typed. */
function displayPhone(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

/**
 * Sign in with a one-time code, by email or by text message: the address or number first, then
 * the code (<CodeStep>). Email codes may create the account, as the legacy page allowed.
 */
export function CodeSignIn({
  channel,
  onSignedIn,
}: {
  channel: CodeChannel;
  onSignedIn: (session: Session) => void;
}) {
  const { client } = useAuth();
  const copy = COPY[channel];
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (target: string): Promise<string | null> => {
    try {
      const supabase = await client();
      const { error } =
        channel === 'email'
          ? await supabase.auth.signInWithOtp({
              email: target,
              options: { emailRedirectTo: `${window.location.origin}${AUTH_CALLBACK_PATH}` },
            })
          : await supabase.auth.signInWithOtp({ phone: target });
      if (error) throw error;
      return null;
    } catch (error) {
      return authErrorMessage(error);
    }
  };

  const verify = async (token: string): Promise<string | null> => {
    if (!sentTo) return 'Ask for a code first.';
    try {
      const supabase = await client();
      const { data, error } =
        channel === 'email'
          ? await supabase.auth.verifyOtp({ email: sentTo, token, type: 'email' })
          : await supabase.auth.verifyOtp({ phone: sentTo, token, type: 'sms' });
      if (error) throw error;
      if (!data.session) return 'That code did not sign you in. Ask for a new one.';
      onSignedIn(data.session);
      return null;
    } catch (error) {
      return authErrorMessage(error);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = channel === 'email' ? validateEmail(value) : validatePhone(value);
    setFieldError(problem);
    if (problem) {
      event.currentTarget.querySelector<HTMLInputElement>('input')?.focus();
      return;
    }
    const target = channel === 'email' ? normalizeEmail(value) : (normalizePhone(value) ?? '');
    setPending(true);
    setFormError(null);
    const failure = await send(target);
    setPending(false);
    if (failure) setFormError(failure);
    else setSentTo(target);
  };

  if (sentTo) {
    return (
      <CodeStep
        destination={channel === 'email' ? sentTo : displayPhone(sentTo)}
        onVerify={verify}
        onResend={() => send(sentTo)}
        onBack={() => setSentTo(null)}
        backLabel={copy.back}
      />
    );
  }

  return (
    <form noValidate onSubmit={event => void submit(event)} className="grid gap-5">
      <Field label={copy.label} description={copy.hint} error={fieldError}>
        {control =>
          channel === 'email' ? (
            <Input
              {...control}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={value}
              onChange={event => {
                setValue(event.target.value);
                if (fieldError) setFieldError(null);
              }}
            />
          ) : (
            <Input
              {...control}
              type="tel"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              value={value}
              onChange={event => {
                setValue(event.target.value);
                if (fieldError) setFieldError(null);
              }}
            />
          )
        }
      </Field>
      <FormStatus error={formError} status={null} />
      <Button type="submit" className="w-full" loading={pending}>
        {copy.send}
      </Button>
    </form>
  );
}
