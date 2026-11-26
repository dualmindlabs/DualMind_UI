import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { type CallbackUrl, ChangePasswordForm, UpdatePasswordPage } from '@/features/auth';
import { createApiClient, createQueryClient } from '@/lib/api';
import { createAuthStore } from '@/lib/supabase';

import { fakeSession, memoryStorage } from '../../lib/supabase/helpers';

// A live session alone must not be enough to change a password: the form checks the current
// password first (or, for an account without one, an emailed code), and the reset page works
// only for a visitor who arrived from a reset link.

const CONFIG = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};
const STRONG = 'Tabs&Spaces-2026';

function makeAuth(signInError: unknown = null, event: string | null = null) {
  const session = fakeSession();
  return {
    getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
    // supabase-js fires PASSWORD_RECOVERY itself once it has validated the link's tokens.
    onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
      if (event) queueMicrotask(() => callback(event, session));
      return { data: { subscription: { unsubscribe: () => {} } } };
    }),
    signInWithPassword: vi.fn((_credentials: unknown) =>
      Promise.resolve({ data: { session }, error: signInError }),
    ),
    reauthenticate: vi.fn(() => Promise.resolve({ error: null })),
    updateUser: vi.fn((_attributes: unknown) => Promise.resolve({ data: {}, error: null })),
  };
}

function renderWith(auth: ReturnType<typeof makeAuth>, ui: ReactElement) {
  const store = createAuthStore({
    config: CONFIG,
    loadClient: () => Promise.resolve({ auth } as never),
    localStorage: memoryStorage({ [CONFIG.storageKey]: '{}' }),
    sessionStorage: memoryStorage(),
    getLocation: () => ({ search: '', hash: '' }),
  });
  return render(
    <MemoryRouter>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <AuthProvider store={store}>{ui}</AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

async function fillNewPassword() {
  await userEvent.type(screen.getByLabelText('New password', { exact: true }), STRONG);
  await userEvent.type(screen.getByLabelText('Confirm password', { exact: true }), STRONG);
}

describe('ChangePasswordForm', () => {
  it('checks the current password before it saves the new one', async () => {
    const auth = makeAuth();
    const onChanged = vi.fn();
    renderWith(auth, <ChangePasswordForm onChanged={onChanged} onCancel={() => {}} />);
    await userEvent.type(await screen.findByLabelText('Current password'), 'old-secret');
    await fillNewPassword();
    await userEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: 'old-secret',
    });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG });
    const order = [
      auth.signInWithPassword.mock.invocationCallOrder[0]!,
      auth.updateUser.mock.invocationCallOrder[0]!,
    ];
    expect(order[0]).toBeLessThan(order[1]!);
  });

  it('does not save when the current password is wrong', async () => {
    const auth = makeAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' });
    const onChanged = vi.fn();
    renderWith(auth, <ChangePasswordForm onChanged={onChanged} onCancel={() => {}} />);
    await userEvent.type(await screen.findByLabelText('Current password'), 'wrong');
    await fillNewPassword();
    await userEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(await screen.findByText('That is not your current password.')).toBeVisible();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('asks for the current password when the field is empty', async () => {
    const auth = makeAuth();
    renderWith(auth, <ChangePasswordForm onChanged={() => {}} onCancel={() => {}} />);
    await fillNewPassword();
    await userEvent.click(await screen.findByRole('button', { name: 'Save new password' }));
    expect(await screen.findByText('Enter your current password.')).toBeVisible();
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it('lets a password-less email account switch to the emailed code', async () => {
    const auth = makeAuth();
    const onChanged = vi.fn();
    renderWith(auth, <ChangePasswordForm onChanged={onChanged} onCancel={() => {}} />);
    await userEvent.click(await screen.findByRole('button', { name: /Email me a code instead/ }));
    expect(screen.queryByLabelText('Current password')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
    await userEvent.type(await screen.findByLabelText('Code from the email'), '654321');
    await fillNewPassword();
    await userEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG, nonce: '654321' });
  });

  it('uses an emailed code for an account that has no password yet', async () => {
    const auth = makeAuth();
    const onChanged = vi.fn();
    renderWith(
      auth,
      <ChangePasswordForm usesPassword={false} onChanged={onChanged} onCancel={() => {}} />,
    );
    expect(screen.queryByLabelText('Current password')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Email me a code' }));
    await userEvent.type(await screen.findByLabelText('Code from the email'), ' 123456 ');
    await fillNewPassword();
    await userEvent.click(screen.getByRole('button', { name: 'Save new password' }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(auth.reauthenticate).toHaveBeenCalledTimes(1);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG, nonce: '123456' });
  });
});

describe('UpdatePasswordPage', () => {
  const link = (overrides: Partial<CallbackUrl>): CallbackUrl => ({
    type: null,
    hasTokens: false,
    hasCode: false,
    error: null,
    welcome: false,
    redirect: null,
    ...overrides,
  });

  it('does not show the form to a signed-in visitor who has no reset link', async () => {
    renderWith(makeAuth(), <UpdatePasswordPage link={link({})} />);
    expect(
      await screen.findByRole('heading', { name: 'Open the link from your email' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('New password', { exact: true })).toBeNull();
  });

  it('does not show the form for ?type=recovery without the recovery tokens', async () => {
    renderWith(makeAuth(), <UpdatePasswordPage link={link({ type: 'recovery' })} />);
    expect(
      await screen.findByRole('heading', { name: 'Open the link from your email' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('New password', { exact: true })).toBeNull();
  });

  it('keeps the form after a reload of a real reset link (fresh tab marker), and clears it when done', async () => {
    window.sessionStorage.setItem(
      'dm.recovery.v1',
      JSON.stringify({ savedAt: Date.now() - 60_000 }),
    );
    try {
      const auth = makeAuth();
      renderWith(auth, <UpdatePasswordPage link={link({})} />);
      expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeVisible();
      await fillNewPassword();
      await userEvent.click(screen.getByRole('button', { name: 'Save new password' }));
      await waitFor(() => expect(auth.updateUser).toHaveBeenCalledWith({ password: STRONG }));
      await waitFor(() => expect(window.sessionStorage.getItem('dm.recovery.v1')).toBeNull());
    } finally {
      window.sessionStorage.removeItem('dm.recovery.v1');
    }
  });

  it.each([
    ['an old bare marker', '1'],
    [
      'a marker older than the link (one hour)',
      JSON.stringify({ savedAt: Date.now() - 61 * 60_000 }),
    ],
    ['a marker from the future', JSON.stringify({ savedAt: Date.now() + 60_000 })],
    ['a broken marker', '{not json'],
  ])('does not accept %s', async (_name, value) => {
    window.sessionStorage.setItem('dm.recovery.v1', value);
    try {
      renderWith(makeAuth(), <UpdatePasswordPage link={link({})} />);
      expect(
        await screen.findByRole('heading', { name: 'Open the link from your email' }),
      ).toBeVisible();
      expect(screen.queryByLabelText('New password', { exact: true })).toBeNull();
    } finally {
      window.sessionStorage.removeItem('dm.recovery.v1');
    }
  });

  it('writes the tab marker from the PASSWORD_RECOVERY event', async () => {
    try {
      renderWith(
        makeAuth(null, 'PASSWORD_RECOVERY'),
        <UpdatePasswordPage link={link({ type: 'recovery', hasTokens: true })} />,
      );
      await screen.findByRole('heading', { name: 'Choose a new password' });
      const mark = JSON.parse(window.sessionStorage.getItem('dm.recovery.v1') ?? 'null') as {
        savedAt: number;
      };
      expect(Date.now() - mark.savedAt).toBeLessThan(60_000);
    } finally {
      window.sessionStorage.removeItem('dm.recovery.v1');
    }
  });

  it('shows the form once supabase-js has validated the link (PASSWORD_RECOVERY)', async () => {
    renderWith(
      makeAuth(null, 'PASSWORD_RECOVERY'),
      <UpdatePasswordPage link={link({ type: 'recovery', hasTokens: true })} />,
    );
    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  });

  it('does NOT show the form to a signed-in visitor for a hash with made-up tokens', async () => {
    // /update-password.html#access_token=x&refresh_token=x&type=recovery: supabase-js rejects the
    // tokens, keeps the existing session and fires no PASSWORD_RECOVERY (cycle 5 P2-1).
    try {
      const auth = makeAuth();
      renderWith(auth, <UpdatePasswordPage link={link({ type: 'recovery', hasTokens: true })} />);
      expect(
        await screen.findByRole('heading', { name: 'Open the link from your email' }),
      ).toBeVisible();
      expect(screen.queryByLabelText('New password', { exact: true })).toBeNull();
      expect(window.sessionStorage.getItem('dm.recovery.v1')).toBeNull();
      expect(auth.updateUser).not.toHaveBeenCalled();
    } finally {
      window.sessionStorage.removeItem('dm.recovery.v1');
    }
  });
});
