import type { User } from '@supabase/supabase-js';
import { KeyRound, LogOut } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { ChangePasswordForm } from '@/features/auth';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import { authErrorMessage, toUserSyncInput, validateName } from '@/lib/supabase';

import { SettingsCard, SettingsSection } from './settings-card';

const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  email: 'Email',
  phone: 'Phone',
  google: 'Google',
  github: 'GitHub',
};

/** The name the account shows: the one set here (Supabase `full_name`), then the API profile's. */
export function displayNameOf(user: User, profileName: string | null | undefined): string {
  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name.trim() : '';
  return fullName || profileName?.trim() || '';
}

export function providerOf(user: User): string {
  const provider = user.app_metadata?.provider;
  return typeof provider === 'string' ? provider : 'email';
}

function initialOf(name: string, email: string | undefined): string {
  return (name || email || 'Y').trim().charAt(0).toUpperCase() || 'Y';
}

function memberSince(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function IdentityCard({ user, name }: { user: User; name: string }) {
  const provider = providerOf(user);
  const since = memberSince(user.created_at);
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-5 shadow-raise sm:p-6">
      <span
        aria-hidden="true"
        className="grid size-14 shrink-0 place-items-center rounded-full border border-human/50 bg-human-tint text-h3 font-medium text-human"
      >
        {initialOf(name, user.email)}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="truncate text-ui font-medium text-fg" data-testid="settings-identity-name">
          {name || user.email || 'Your account'}
        </p>
        {user.email ? <p className="truncate text-ui-sm text-fg-soft">{user.email}</p> : null}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-caption text-muted">
          <span>Signs in with</span>
          <Badge variant="outline">{PROVIDER_LABELS[provider] ?? provider}</Badge>
          {since ? <span className="basis-full sm:basis-auto">Member since {since}</span> : null}
        </p>
      </div>
    </div>
  );
}

function NameCard({ user, current }: { user: User; current: string }) {
  const { client } = useAuth();
  const api = useApiClient();
  const errorId = useId();
  const [name, setName] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== current;

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateName(name);
    setError(problem);
    if (problem) {
      event.currentTarget.querySelector('input')?.focus();
      return;
    }
    setSaving(true);
    try {
      const supabase = await client();
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });
      if (updateError) throw updateError;
      setName(name.trim());
      toast.success('Name saved', { description: 'It shows in your account menu.' });
      // The API keeps a copy of the name (POST /api/users/sync): best effort, like sign-in.
      const updated = data.user ?? user;
      void api.syncUser(toUserSyncInput(updated)).catch(() => undefined);
    } catch (caught) {
      setError(authErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  // The form wraps the whole card, so the Save button in its footer submits it.
  return (
    <form noValidate onSubmit={event => void save(event)} aria-label="Display name">
      <SettingsCard
        title="Display name"
        description="How the Arena addresses you, in the account menu and on this page."
        footer={
          <>
            <span>Up to 80 characters.</span>
            <Button type="submit" size="sm" loading={saving} disabled={!dirty}>
              Save
            </Button>
          </>
        }
      >
        {({ titleId, descriptionId }) => (
          <div className="grid gap-2">
            <Input
              name="display-name"
              autoComplete="name"
              maxLength={120}
              value={name}
              aria-labelledby={titleId}
              aria-describedby={error ? `${descriptionId} ${errorId}` : descriptionId}
              aria-invalid={error ? true : undefined}
              onChange={event => {
                setName(event.target.value);
                setError(null);
              }}
              className="max-w-md"
            />
            {error ? <FieldError id={errorId}>{error}</FieldError> : null}
          </div>
        )}
      </SettingsCard>
    </form>
  );
}

function EmailCard({ email }: { email: string }) {
  return (
    <SettingsCard
      title="Email"
      description="The address you sign in with and where sign-in emails go."
      footer={
        <span>
          To change it, write to{' '}
          <a
            href="mailto:support@dualmindlab.tech?subject=Change%20my%20sign-in%20email"
            className="text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
          >
            support@dualmindlab.tech
          </a>{' '}
          from this address.
        </span>
      }
    >
      {({ titleId, descriptionId }) => (
        <Input
          readOnly
          type="email"
          value={email}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="max-w-md"
        />
      )}
    </SettingsCard>
  );
}

function PasswordCard({ provider }: { provider: string }) {
  const [open, setOpen] = useState(false);
  const usesPassword = provider === 'email';
  return (
    <SettingsCard
      title="Password"
      description={
        usesPassword
          ? 'Choose a new password for signing in with your email. The rules are the same as at sign-up.'
          : `You sign in with ${PROVIDER_LABELS[provider] ?? provider}. You can also set a password to sign in with your email.`
      }
    >
      {open ? (
        <ChangePasswordForm
          onChanged={() => {
            setOpen(false);
            toast.success('Password changed', {
              description: 'Use the new password the next time you sign in.',
            });
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <KeyRound aria-hidden="true" strokeWidth={1.75} />
            {usesPassword ? 'Change password' : 'Set a password'}
          </Button>
        </div>
      )}
    </SettingsCard>
  );
}

function SignOutCard() {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);
  return (
    <SettingsCard
      title="Sign out"
      description="Signs you out of DualMind Arena on every device. Your settings on this device stay."
    >
      <div>
        <Button
          variant="outline"
          size="sm"
          loading={pending}
          onClick={() => {
            setPending(true);
            // The page guard sends you to the home page once the session is gone.
            void signOut();
          }}
        >
          <LogOut aria-hidden="true" strokeWidth={1.75} />
          Sign out
        </Button>
      </div>
    </SettingsCard>
  );
}

/** Profile: who is signed in, the display name, the email, the password and sign out. */
export function ProfileSection({ user, profileName }: { user: User; profileName: string | null }) {
  const name = displayNameOf(user, profileName);
  return (
    <SettingsSection
      id="profile"
      title="Profile"
      description="Your account details. Changes here are saved to your account."
    >
      <IdentityCard user={user} name={name} />
      <NameCard user={user} current={name} />
      {user.email ? <EmailCard email={user.email} /> : null}
      <PasswordCard provider={providerOf(user)} />
      <SignOutCard />
    </SettingsSection>
  );
}
