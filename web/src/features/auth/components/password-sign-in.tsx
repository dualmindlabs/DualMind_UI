import type { Session } from '@supabase/supabase-js';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import {
  authErrorMessage,
  FORGOT_PASSWORD_PATH,
  normalizeEmail,
  validateEmail,
  validatePasswordPresent,
} from '@/lib/supabase';

import { FormStatus } from './form-status';
import { PasswordInput } from './password-input';

interface Errors {
  email: string | null;
  password: string | null;
}

/** Email and password, with the "Forgot password?" link next to the password label. */
export function PasswordSignIn({ onSignedIn }: { onSignedIn: (session: Session) => void }) {
  const { client } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({ email: null, password: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const next: Errors = {
      email: validateEmail(email),
      password: validatePasswordPresent(password),
    };
    setErrors(next);
    if (next.email || next.password) {
      const field = next.email ? 'email' : 'password';
      form.querySelector<HTMLInputElement>(`input[name="${field}"]`)?.focus();
      return;
    }
    setPending(true);
    setFormError(null);
    setStatus('Signing you in');
    try {
      const supabase = await client();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw error;
      setStatus('Signed in. Taking you to the Arena');
      onSignedIn(data.session);
    } catch (error) {
      setStatus(null);
      setFormError(authErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={event => void submit(event)} className="grid gap-5">
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
            onChange={event => {
              setEmail(event.target.value);
              if (errors.email) setErrors(current => ({ ...current, email: null }));
            }}
          />
        )}
      </Field>
      <div className="grid gap-2">
        <Field label="Password" error={errors.password}>
          {control => (
            <PasswordInput
              {...control}
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={event => {
                setPassword(event.target.value);
                if (errors.password) setErrors(current => ({ ...current, password: null }));
              }}
            />
          )}
        </Field>
        <Link
          to={FORGOT_PASSWORD_PATH}
          className="inline-flex min-h-11 items-center justify-self-start rounded-sm text-ui-sm text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
        >
          Forgot your password?
        </Link>
      </div>
      <FormStatus error={formError} status={status} />
      <Button type="submit" className="w-full" loading={pending}>
        Sign in
      </Button>
    </form>
  );
}
