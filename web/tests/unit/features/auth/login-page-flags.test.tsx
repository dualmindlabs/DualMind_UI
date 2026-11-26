import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import type * as Features from '@/config/features';
import { LoginPage } from '@/features/auth';
import { createApiClient, createQueryClient } from '@/lib/api';
import { type AuthStore, createAuthStore } from '@/lib/supabase';

import { type fakeSession, memoryStorage } from '../../lib/supabase/helpers';

const CONFIG = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};

function storeWith(session: ReturnType<typeof fakeSession> | null): AuthStore {
  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  };
  return createAuthStore({
    config: CONFIG,
    loadClient: () => Promise.resolve({ auth } as never),
    localStorage: memoryStorage(session ? { [CONFIG.storageKey]: '{}' } : {}),
    sessionStorage: memoryStorage(),
    getLocation: () => ({ search: '', hash: '' }),
  });
}

function renderLogin(store: AuthStore, path = '/login/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <AuthProvider store={store}>
          <LoginPage />
        </AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}


// Cycle 2 audit P0-1: the phone tab exists only behind VITE_FEATURE_PHONE_SIGNIN, and even then
// only an explicit +91 number is accepted.
vi.mock('@/config/features', async importOriginal => {
  const actual = await importOriginal<typeof Features>();
  return { ...actual, buildFlags: { ...actual.buildFlags, phoneSignIn: true } };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LoginPage with the phone sign-in flag on', () => {
  it('shows the phone tab', async () => {
    renderLogin(storeWith(null));
    const tabs = screen.getAllByRole('tab').map(tab => tab.textContent);
    expect(tabs).toEqual(['Password', 'Email code', 'Phone code']);
    await userEvent.click(screen.getByRole('tab', { name: 'Phone code' }));
    expect(await screen.findByLabelText('Phone number')).toHaveAttribute('autocomplete', 'tel');
  });

  it('refuses a bare number and a country that is not allowed, before any request', async () => {
    renderLogin(storeWith(null));
    await userEvent.click(screen.getByRole('tab', { name: 'Phone code' }));
    const input = await screen.findByLabelText('Phone number');
    await userEvent.type(input, '9876543210');
    await userEvent.click(screen.getByRole('button', { name: 'Text me a code' }));
    expect(await screen.findByText(/Start with the country code/)).toBeVisible();
    await userEvent.clear(input);
    await userEvent.type(input, '+1 415 555 0100');
    await userEvent.click(screen.getByRole('button', { name: 'Text me a code' }));
    expect(await screen.findByText(/only available for numbers with the country code \+91/)).toBeVisible();
  });
});

describe('in-app browsers', () => {
  const LINKEDIN =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.1234';

  it('warns that Google does not work there, and offers the other ways in', async () => {
    vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(LINKEDIN);
    renderLogin(storeWith(null));
    const notice = await screen.findByTestId('in-app-browser-notice');
    expect(notice).toHaveTextContent('Open this page in your browser to use Google');
    expect(notice).toHaveTextContent('LinkedIn');
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Continue with GitHub/ })).toBeVisible();
  });

  it('shows no warning in a normal browser', () => {
    renderLogin(storeWith(null));
    expect(screen.queryByTestId('in-app-browser-notice')).not.toBeInTheDocument();
  });
});
