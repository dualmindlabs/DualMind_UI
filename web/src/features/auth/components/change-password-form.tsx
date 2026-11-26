import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import {
  authErrorMessage,
  checkPwnedPassword,
  evaluatePassword,
  validatePasswordMatch,
} from '@/lib/supabase';

import { useBreachCheck } from '../hooks/use-breach-check';
import { FormStatus } from './form-status';
import { NewPasswordFields } from './new-password-fields';
import { PasswordInput } from './password-input';

const PWNED = 'This password appears in known data breaches. Choose a different one.';
const WRONG_CURRENT = 'That is not your current password.';

/** True for the error Supabase sends when the email and password do not match. */
function isWrongCredentials(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'invalid_credentials';
}

export interface ChangePasswordFormProps {
  /** After Supabase accepted the new password. */
  onChanged: () => void;
  onCancel: () => void;
  /**
   * True when the account signs in with an email and password: the form asks for the current one.
   * False for an account that only has GitHub or Google: it asks for the code that Supabase emails
   * (a reauthentication nonce) instead, because there is no current password to check.
   */
  usesPassword?: boolean;
}

/**
 * A new password for the signed-in account (the settings page, slice S12), with the same rules,
 * strength hint and breach check as sign-up and the reset page (lib/supabase/password.ts), saved
 * with `auth.updateUser({ password })`. A live session alone is not enough: the form first checks
 * the current password with `signInWithPassword`, or, for an account without a password, asks for
 * the emailed `reauthenticate()` code and sends it as the `nonce`.
 */
export function ChangePasswordForm({
  onChanged,
  onCancel,
  usesPassword: startsWithPassword = true,
}: ChangePasswordFormProps) {
  // An account made with the email-code tab has provider `email` but no password, so the
  // current-password path always offers the emailed code as a way out.
  const [viaCode, setViaCode] = useState(!startsWithPassword);
  const usesPassword = !viaCode;
  const { client, user } = useAuth();
  const [current, setCurrent] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [nonce, setNonce] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const breach = useBreachCheck(password);

  const sendCode = async () => {
    setPending(true);
    setFormError(null);
    try {
      const supabase = await client();
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw error;
      setCodeSent(true);
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
    setPending(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const focus = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus();
    const missingCurrent = usesPassword && current === '' ? 'Enter your current password.' : null;
    const missingCode =
      !usesPassword && nonce.trim() === '' ? 'Enter the code from the email.' : null;
    setCurrentError(missingCurrent);
    setCodeError(missingCode);
    if (missingCurrent || missingCode) {
      focus(missingCurrent ? 'current-password' : 'nonce');
      return;
    }
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
      focus(nextPassword ? 'new-password' : 'confirm-password');
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      if (breach.status !== 'clean' && breach.status !== 'unavailable') {
        const result = await checkPwnedPassword(password);
        if (result.status === 'pwned') {
          setPasswordError(PWNED);
          setPending(false);
          focus('new-password');
          return;
        }
      }
      const supabase = await client();
      if (usesPassword) {
        const email = user?.email;
        if (!email)
          throw new Error('This account has no email address to check the password with.');
        const check = await supabase.auth.signInWithPassword({ email, password: current });
        if (check.error) {
          if (isWrongCredentials(check.error)) {
            setCurrentError(WRONG_CURRENT);
            setPending(false);
            focus('current-password');
            return;
          }
          throw check.error;
        }
      }
      const { error } = await supabase.auth.updateUser(
        usesPassword ? { password } : { password, nonce: nonce.trim() },
      );
      if (error) throw error;
      setPending(false);
      onChanged();
    } catch (error) {
      setFormError(authErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <form
      noValidate
      aria-label="Change password"
      onSubmit={event => void submit(event)}
      className="grid gap-5"
    >
      {usesPassword ? (
        <Field label="Current password" error={currentError}>
          {control => (
            <PasswordInput
              {...control}
              name="current-password"
              autoComplete="current-password"
              value={current}
              disabled={pending}
              onChange={event => {
                setCurrent(event.target.value);
                setCurrentError(null);
              }}
            />
          )}
        </Field>
      ) : codeSent ? (
        <Field
          label="Code from the email"
          description="We sent a code to your email address. It proves it is you."
          error={codeError}
        >
          {control => (
            <Input
              {...control}
              name="nonce"
              autoComplete="one-time-code"
              inputMode="numeric"
              value={nonce}
              disabled={pending}
              onChange={event => {
                setNonce(event.target.value);
                setCodeError(null);
              }}
            />
          )}
        </Field>
      ) : (
        <div className="grid gap-2">
          <p className="text-ui-sm text-fg-soft">
            You sign in without a password, so we check it is you with a code sent to your email
            before you set one.
          </p>
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void sendCode()}
              loading={pending}
            >
              Email me a code
            </Button>
          </div>
        </div>
      )}
      {usesPassword && startsWithPassword && (
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setViaCode(true);
              setCurrentError(null);
            }}
            disabled={pending}
          >
            No password yet, or forgot it? Email me a code instead
          </Button>
        </div>
      )}
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
      <FormStatus error={formError} status={null} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" loading={pending} disabled={!usesPassword && !codeSent}>
          Save new password
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
