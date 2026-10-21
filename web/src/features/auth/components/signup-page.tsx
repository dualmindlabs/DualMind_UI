import { MailCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { config } from '@/config/env';
import { useAuth } from '@/hooks/use-auth';
import {
  AUTH_CALLBACK_PATH,
  authErrorMessage,
  checkPwnedPassword,
  evaluatePassword,
  LOGIN_PATH,
  normalizeEmail,
  validateEmail,
  validateName,
  validatePasswordMatch,
  withRedirect,
} from '@/lib/supabase';

import { QUOTES, RESEND_COOLDOWN_SECONDS } from '../content/copy';
import { useBreachCheck } from '../hooks/use-breach-check';
import { useCooldown } from '../hooks/use-cooldown';
import { goTo, useRedirectTarget } from '../hooks/use-redirect-target';
import { AuthGate } from './auth-gate';
import { AuthHeading } from './auth-heading';
import { AuthShell } from './auth-shell';
import { FormStatus } from './form-status';
import { NewPasswordFields } from './new-password-fields';
import { NoticeCard } from './notice-card';
import { OAuthButtons, OrDivider } from './oauth-buttons';

interface Errors {
  name: string | null;
  email: string | null;
  password: string | null;
  confirm: string | null;
}

const NO_ERRORS: Errors = { name: null, email: null, password: null, confirm: null };

/** The input behind each error, in page order (the first one with an error gets the focus). */
const FIELD_NAMES = {
  name: 'name',
  email: 'email',
  password: 'new-password',
  confirm: 'confirm-password',
} as const satisfies Record<keyof Errors, string>;

const LINK =
  'font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current';

/** "Check your email": the confirmation link is on its way; resend with a cooldown. */
function ConfirmEmail({ email, onBack }: { email: string; onBack: () => void }) {
  const { client } = useAuth();
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resend = async () => {
    setError(null);
    setStatus(null);
    try {
      const supabase = await client();
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}${AUTH_CALLBACK_PATH}` },
      });
      if (resendError) throw resendError;
      setStatus(`We sent the link to ${email} again.`);
      cooldown.start();
    } catch (cause) {
      setError(authErrorMessage(cause));
    }
  };

  return (
    <NoticeCard icon={MailCheck} tone="good" title="Check your email">
      <p>
        We sent a confirmation link to <strong className="break-all text-fg">{email}</strong>. Open
        it on this device to finish creating your account; you will be signed in right away.
      </p>
      <p className="text-caption text-muted">
        Nothing after a few minutes? Look in your spam folder, or send it again.
      </p>
      <FormStatus error={error} status={status} />
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={cooldown.remaining > 0} onClick={() => void resend()}>
          {cooldown.remaining > 0 ? `Resend in ${cooldown.remaining} s` : 'Resend the link'}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Use a different email
        </Button>
      </div>
    </NoticeCard>
  );
}

/**
 * `/signup/`: name, email, a new password (strength rules, the breach check), its confirmation;
 * Google and GitHub too. With email confirmation on (the usual case) the page then says to check
 * the inbox; the link lands on /auth-callback.html.
 */
export function SignupPage() {
  const { client } = useAuth();
  const target = useRedirectTarget();
  const { search } = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const breach = useBreachCheck(password);

  const clear = (key: keyof Errors) => {
    if (errors[key]) setErrors(current => ({ ...current, [key]: null }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const evaluation = evaluatePassword(password);
    const next: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password:
        password === ''
          ? 'Choose a password.'
          : evaluation.ok
            ? breach.status === 'pwned'
              ? 'This password appears in known data breaches. Choose a different one.'
              : null
            : 'Your password needs every item in the list below.',
      confirm: validatePasswordMatch(password, confirm),
    };
    setErrors(next);
    const firstInvalid = (Object.keys(FIELD_NAMES) as Array<keyof Errors>).find(key => next[key]);
    if (firstInvalid) {
      form.querySelector<HTMLInputElement>(`input[name="${FIELD_NAMES[firstInvalid]}"]`)?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    setStatus('Creating your account');
    try {
      // The check may still be running (or never ran): wait for an answer before sending.
      if (breach.status !== 'clean' && breach.status !== 'unavailable') {
        const result = await checkPwnedPassword(password);
        if (result.status === 'pwned') {
          setErrors(current => ({
            ...current,
            password: 'This password appears in known data breaches. Choose a different one.',
          }));
          setStatus(null);
          setPending(false);
          form.querySelector<HTMLInputElement>('input[name="new-password"]')?.focus();
          return;
        }
      }
      const supabase = await client();
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: {
          data: { full_name: name.trim(), avatar_url: null },
          emailRedirectTo: `${window.location.origin}${AUTH_CALLBACK_PATH}`,
        },
      });
      if (error) throw error;
      if (data.session) {
        setStatus('Account created. Taking you to the Arena');
        goTo(target);
        return;
      }
      setStatus(null);
      setPending(false);
      setConfirmFor(normalizeEmail(email));
    } catch (error) {
      setStatus(null);
      setFormError(authErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <AuthShell quote={QUOTES.signup}>
      <div className="grid gap-8">
        <AuthHeading
          eyebrow="Create an account"
          title="Two models. One prompt."
          voice="You decide."
          lead="Free. Ask once, compare two anonymous answers, and your vote moves the leaderboard."
        />
        <AuthGate target={target}>
          {confirmFor ? (
            <ConfirmEmail email={confirmFor} onBack={() => setConfirmFor(null)} />
          ) : (
            <div className="grid gap-6">
              <div className="grid gap-3">
                <OAuthButtons onError={setProviderError} />
                <FormStatus error={providerError} status={null} />
              </div>
              <OrDivider label="or with your email" />
              <form noValidate onSubmit={event => void submit(event)} className="grid gap-5">
                <Field label="Name" error={errors.name}>
                  {control => (
                    <Input
                      {...control}
                      name="name"
                      autoComplete="name"
                      value={name}
                      disabled={pending}
                      onChange={event => {
                        setName(event.target.value);
                        clear('name');
                      }}
                    />
                  )}
                </Field>
                <Field label="Email" error={errors.email}>
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
                        clear('email');
                      }}
                    />
                  )}
                </Field>
                <NewPasswordFields
                  password={password}
                  confirm={confirm}
                  onPasswordChange={value => {
                    setPassword(value);
                    clear('password');
                  }}
                  onConfirmChange={value => {
                    setConfirm(value);
                    clear('confirm');
                  }}
                  breach={breach}
                  passwordError={errors.password}
                  confirmError={errors.confirm}
                  disabled={pending}
                />
                <FormStatus error={formError} status={status} />
                <Button type="submit" className="w-full" loading={pending}>
                  Create account
                </Button>
                <p className="text-caption text-muted">
                  By creating an account you agree to the{' '}
                  <a className={LINK} href="/terms/">
                    Terms
                  </a>{' '}
                  and the{' '}
                  <a className={LINK} href="/privacy/">
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
            </div>
          )}
        </AuthGate>
        <p className="text-ui-sm text-fg-soft">
          Already have an account?{' '}
          <Link to={withRedirect(LOGIN_PATH, search, config.siteUrl)} className={LINK}>
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
