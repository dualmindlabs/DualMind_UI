import { MailCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { config } from '@/config/env';
import { useAuth } from '@/hooks/use-auth';
import {
  authErrorMessage,
  LOGIN_PATH,
  normalizeEmail,
  UPDATE_PASSWORD_PATH,
  validateEmail,
  withRedirect,
} from '@/lib/supabase';

import { QUOTES, RESEND_COOLDOWN_SECONDS } from '../content/copy';
import { useCooldown } from '../hooks/use-cooldown';
import { AuthHeading } from './auth-heading';
import { AuthShell } from './auth-shell';
import { FormStatus } from './form-status';
import { NoticeCard } from './notice-card';
import { UnavailableNotice } from './unavailable-notice';

const LINK =
  'font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current';

/**
 * `/forgot-password/`: asks for the email, then says what happens next. Supabase sends the reset
 * link to /update-password.html (the same address as before, so links already in inboxes work).
 * The answer is the same whether or not an account exists, so the page reveals nothing.
 */
export function ForgotPasswordPage() {
  const { status: authStatus, client } = useAuth();
  const { search } = useLocation();
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);

  const send = async (address: string): Promise<string | null> => {
    try {
      const supabase = await client();
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}${UPDATE_PASSWORD_PATH}`,
      });
      if (error) throw error;
      return null;
    } catch (error) {
      return authErrorMessage(error);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const problem = validateEmail(email);
    setFieldError(problem);
    if (problem) {
      form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    setStatus('Sending the link');
    const address = normalizeEmail(email);
    const failure = await send(address);
    setPending(false);
    setStatus(null);
    if (failure) {
      setFormError(failure);
      return;
    }
    setSentTo(address);
    cooldown.start();
  };

  const resend = async () => {
    if (!sentTo) return;
    setFormError(null);
    setStatus(null);
    const failure = await send(sentTo);
    if (failure) {
      setFormError(failure);
      return;
    }
    setStatus(`We sent another link to ${sentTo}.`);
    cooldown.start();
  };

  const loginHref = withRedirect(LOGIN_PATH, search, config.siteUrl);

  return (
    <AuthShell quote={QUOTES.recovery}>
      <div className="grid gap-8">
        <AuthHeading
          eyebrow="Password reset"
          title="Forgot your password?"
          voice="It happens."
          lead="Enter the email you signed up with. We will send you a link to choose a new password."
        />
        {authStatus === 'unavailable' ? (
          <UnavailableNotice />
        ) : sentTo ? (
          <NoticeCard icon={MailCheck} tone="good" title="Check your email">
            <p>
              If there is an account for <strong className="break-all text-fg">{sentTo}</strong>, a
              link to reset your password is on its way. It works once, for one hour.
            </p>
            <p className="text-caption text-muted">
              Nothing after a few minutes? Look in your spam folder, or send it again.
            </p>
            <FormStatus error={formError} status={status} />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={cooldown.remaining > 0}
                onClick={() => void resend()}
              >
                {cooldown.remaining > 0 ? `Resend in ${cooldown.remaining} s` : 'Send it again'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSentTo(null);
                  setStatus(null);
                  setFormError(null);
                }}
              >
                Use a different email
              </Button>
            </div>
          </NoticeCard>
        ) : (
          <form noValidate onSubmit={event => void submit(event)} className="grid gap-5">
            <Field label="Email" error={fieldError}>
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
                  }}
                />
              )}
            </Field>
            <FormStatus error={formError} status={status} />
            <Button type="submit" className="w-full" loading={pending}>
              Send the reset link
            </Button>
          </form>
        )}
        <p className="text-ui-sm text-fg-soft">
          Remembered it?{' '}
          <Link to={loginHref} className={LINK}>
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
