import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
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

const PWNED = 'This password appears in known data breaches. Choose a different one.';

export interface ChangePasswordFormProps {
  /** After Supabase accepted the new password. */
  onChanged: () => void;
  onCancel: () => void;
}

/**
 * A new password for the signed-in account (the settings page, slice S12), with the same rules,
 * strength hint and breach check as sign-up and the reset page (lib/supabase/password.ts), saved
 * with `auth.updateUser({ password })` like the legacy `changePassword`.
 */
export function ChangePasswordForm({ onChanged, onCancel }: ChangePasswordFormProps) {
  const { client } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const breach = useBreachCheck(password);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const focus = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.focus();
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
      const { error } = await supabase.auth.updateUser({ password });
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
        <Button type="submit" size="sm" loading={pending}>
          Save new password
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
