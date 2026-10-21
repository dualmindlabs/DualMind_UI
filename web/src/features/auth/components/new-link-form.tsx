import { MailCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import {
  AUTH_CALLBACK_PATH,
  authErrorMessage,
  normalizeEmail,
  UPDATE_PASSWORD_PATH,
  validateEmail,
} from '@/lib/supabase';

import { RESEND_COOLDOWN_SECONDS } from '../content/copy';
import { useCooldown } from '../hooks/use-cooldown';
import { FormStatus } from './form-status';

export type NewLinkKind = 'reset' | 'confirmation';

const COPY = {
  reset: { button: 'Send a new link', sent: 'We sent a new reset link' },
  confirmation: {
    button: 'Resend the confirmation email',
    sent: 'We sent a new confirmation email',
  },
} as const;

/**
 * The way out of an expired or used email link: ask for the address and send a fresh link with
 * the existing Supabase calls (a password reset, or a repeat of the sign-up confirmation). The
 * answer does not say whether an account exists.
 */
export function NewLinkForm({ kind }: { kind: NewLinkKind }) {
  const { client } = useAuth();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const problem = validateEmail(email);
    setFieldError(problem);
    if (problem) {
      form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
      return;
    }
    const address = normalizeEmail(email);
    setPending(true);
    setFormError(null);
    try {
      const supabase = await client();
      const origin = window.location.origin;
      const { error } =
        kind === 'reset'
          ? await supabase.auth.resetPasswordForEmail(address, {
              redirectTo: `${origin}${UPDATE_PASSWORD_PATH}`,
            })
          : await supabase.auth.resend({
              type: 'signup',
              email: address,
              options: { emailRedirectTo: `${origin}${AUTH_CALLBACK_PATH}` },
            });
      if (error) throw error;
      setSentTo(address);
      cooldown.start();
    } catch (cause) {
      setFormError(authErrorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={event => void submit(event)} className="grid w-full gap-4">
      <Field label="Your email" error={fieldError}>
        {control => (
          <Input
            {...control}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            disabled={pending}
            onChange={event => {
              setEmail(event.target.value);
              if (fieldError) setFieldError(null);
              if (sentTo) setSentTo(null);
            }}
          />
        )}
      </Field>
      <FormStatus
        error={formError}
        status={
          sentTo ? `${COPY[kind].sent} to ${sentTo}. Check your inbox and your spam folder.` : null
        }
      />
      <Button
        type="submit"
        className="w-full"
        loading={pending}
        disabled={cooldown.remaining > 0}
        variant={sentTo ? 'secondary' : 'primary'}
      >
        {sentTo ? <MailCheck aria-hidden="true" strokeWidth={1.75} /> : null}
        {cooldown.remaining > 0 ? `Send again in ${cooldown.remaining} s` : COPY[kind].button}
      </Button>
    </form>
  );
}
