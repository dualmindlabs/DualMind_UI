import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { AuthCallbackPage, type CallbackUrl } from '@/features/auth';
import { createApiClient, createQueryClient } from '@/lib/api';
import { createAuthStore } from '@/lib/supabase';

import { fakeSession, memoryStorage } from '../../lib/supabase/helpers';

// Login CSRF (cycle 5 P2-2): a link carrying someone else's tokens must not replace the account
// that is signed in without asking first.

const CONFIG = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};

const LINK: CallbackUrl = {
  type: 'magiclink',
  hasTokens: true,
  hasCode: false,
  error: null,
  welcome: false,
  redirect: null,
};

function renderCallback(switchPending: boolean, reload: () => void = () => {}) {
  const session = fakeSession();
  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  };
  const store = createAuthStore({
    config: CONFIG,
    loadClient: () => Promise.resolve({ auth } as never),
    localStorage: memoryStorage({ [CONFIG.storageKey]: '{}' }),
    sessionStorage: memoryStorage(),
    getLocation: () => ({ search: '', hash: '' }),
  });
  render(
    <MemoryRouter>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <AuthProvider store={store}>
          <AuthCallbackPage link={LINK} switchPending={switchPending} reload={reload} />
        </AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  window.sessionStorage.removeItem('dm.switch.v1');
});

describe('AuthCallbackPage when the link would replace the signed-in account', () => {
  it('asks first, names the current account and does not move on by itself', async () => {
    renderCallback(true);
    expect(
      await screen.findByRole('heading', { name: 'Switch to another account?' }),
    ).toBeVisible();
    expect(screen.getByText(/You are signed in as ada@example.com/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Stay signed in as ada@example.com' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.queryByRole('heading', { name: 'You are signed in' })).toBeNull();
    expect(screen.queryByText(/Taking you to the Arena/)).toBeNull();
  });

  it('remembers the yes for this tab and reloads so supabase-js reads the tokens', async () => {
    const reload = vi.fn();
    renderCallback(true, reload);
    await userEvent.click(await screen.findByRole('button', { name: 'Switch account' }));
    expect(window.sessionStorage.getItem('dm.switch.v1')).toBe('1');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('shows the normal success card when nothing is being replaced', async () => {
    renderCallback(false);
    expect(await screen.findByRole('heading', { name: 'You are signed in' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Switch account' })).toBeNull();
  });

  it('forgets the yes once the new account is in', async () => {
    window.sessionStorage.setItem('dm.switch.v1', '1');
    renderCallback(false);
    await screen.findByRole('heading', { name: 'You are signed in' });
    expect(window.sessionStorage.getItem('dm.switch.v1')).toBeNull();
  });
});
