import { useId } from 'react';

import { Field } from '@/components/ui/field';

import type { BreachState } from '../hooks/use-breach-check';
import { PasswordInput } from './password-input';
import { PasswordStrengthHint } from './password-strength';

export interface NewPasswordFieldsProps {
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  breach: BreachState;
  passwordError: string | null;
  confirmError: string | null;
  disabled?: boolean;
  /** "Password" on sign-up, "New password" on the reset page. */
  label?: string;
}

/** A new password, its strength and breach hints, and the confirmation field. */
export function NewPasswordFields({
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  breach,
  passwordError,
  confirmError,
  disabled = false,
  label = 'Password',
}: NewPasswordFieldsProps) {
  const hintId = useId();
  return (
    <>
      <Field label={label} error={passwordError}>
        {control => (
          <div className="grid gap-3">
            <PasswordInput
              {...control}
              aria-describedby={[control['aria-describedby'], hintId].filter(Boolean).join(' ')}
              name="new-password"
              autoComplete="new-password"
              value={password}
              disabled={disabled}
              onChange={event => onPasswordChange(event.target.value)}
            />
            <PasswordStrengthHint id={hintId} password={password} breach={breach} />
          </div>
        )}
      </Field>
      <Field label="Confirm password" error={confirmError}>
        {control => (
          <PasswordInput
            {...control}
            name="confirm-password"
            autoComplete="new-password"
            value={confirm}
            disabled={disabled}
            onChange={event => onConfirmChange(event.target.value)}
          />
        )}
      </Field>
    </>
  );
}
