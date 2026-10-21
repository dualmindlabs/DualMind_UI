import { type FormEvent, useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import {
  authErrorMessage,
  checkPwnedPassword,
  evaluatePassword,
  FORGOT_PASSWORD_PATH,
  validatePasswordMatch,
} from '@/lib/supabase';

import { useBreachCheck } from '../hooks/use-breach-check';
import { callbackErrorMessage, type CallbackUrl } from '../lib/callback-url';
import { FormStatus } from './form-status';
import { NewPasswordFields } from './new-password-fields';
import { accountLabel } from './signed-in-notice';
import { StatusCard } from './status-card';
import { StatusShell } from './status-shell';

const PWNED = 'This password appears in known data breaches. Choose a different one.';

function NewLinkAction() {
  return (
    <a href={FORGOT_PASSWORD_PATH} className={buttonVariants({ variant: 'primary' })}>
      Send me a new link
    </a>
  );
}

/**
 * `/update-password.html`, the target of the reset email (unchanged address). supabase-js turns
 * the recovery tokens in the #hash into a session; this page then sets the new password. An
 * expired or used link, or a visit without one, gets a plain explanation and a new-link button.
 */
export function UpdatePasswordPage({ link }: { link: CallbackUrl }) {
  const { status: authStatus, user, client } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const breach = useBreachCheck(password);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const nextPassword =
      password === ''
        ? 'Choose a new password.'
        : !evaluatePassword(password).ok
          ? 'Your password needs every item in the list below.'
          : breach.status === 'pwned'
            ? PWNED
            : null;
    const nextConfirm = validatePasswordMatch(password, confirm);
    setPasswordError(nextPassword);
    setConfirmError(nextConfirm);
    if (nextPassword || nextConfirm) {
      const field = nextPassword ? 'new-password' : 'confirm-password';
      form.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    setStatus('Saving your new password');
    try {
      if (breach.status !== 'clean' && breach.status !== 'unavailable') {
        const result = await checkPwnedPassword(password);
        if (result.status === 'pwned') {
          setPasswordError(PWNED);
          setStatus(null);
          setPending(false);
          form.querySelector<HTMLInputElement>('input[name="new-password"]')?.focus();
          return;
        }
      }
      const supabase = await client();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (error) {
      setStatus(null);
      setFormError(authErrorMessage(error));
      setPending(false);
    }
  };

  let content;
  if (link.error) {
    content = (
      <StatusCard tone="error" title="This reset link has expired" action={<NewLinkAction />}>
        {callbackErrorMessage(link.error)}
      </StatusCard>
    );
  } else if (authStatus === 'unavailable') {
    content = (
      <StatusCard tone="error" title="Password reset is unavailable here">
        This copy of DualMind Arena was built without its sign-in settings.
      </StatusCard>
    );
  } else if (authStatus === 'loading') {
    content = (
      <StatusCard tone="working" title="Checking your reset link">
        This takes a moment.
      </StatusCard>
    );
  } else if (authStatus === 'signed-out' || !user) {
    content = (
      <StatusCard tone="error" title="Open the link from your email" action={<NewLinkAction />}>
        This page needs the link from your password reset email. Each link works once, for one hour.
      </StatusCard>
    );
  } else if (done) {
    content = (
      <StatusCard
        tone="success"
        title="Your password is changed"
        action={
          <a href="/" className={buttonVariants({ variant: 'primary' })}>
            Continue to the Arena
          </a>
        }
      >
        You are signed in as {accountLabel(user)}. Use the new password next time.
      </StatusCard>
    );
  } else {
    content = (
      <div className="grid gap-6">
        <div className="grid gap-2">
          <p className="eyebrow text-mind-a">Password reset</p>
          <h1 className="text-h2 font-medium text-fg">Choose a new password</h1>
          <p className="text-body break-all text-fg-soft">For {accountLabel(user)}</p>
        </div>
        <form noValidate onSubmit={event => void submit(event)} className="grid gap-5">
          <NewPasswordFields
            label="New password"
            password={password}
            confirm={confirm}
            onPasswordChange={value => {
              setPassword(value);
              setPasswordError(null);
            }}
            onConfirmChange={value => {
              setConfirm(value);
              setConfirmError(null);
            }}
            breach={breach}
            passwordError={passwordError}
            confirmError={confirmError}
            disabled={pending}
          />
          <FormStatus error={formError} status={status} />
          <Button type="submit" className="w-full" loading={pending}>
            Save new password
          </Button>
        </form>
      </div>
    );
  }

  return <StatusShell>{content}</StatusShell>;
}
