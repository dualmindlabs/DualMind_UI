import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { LoginPage } from '@/features/auth';
import { createApiClient, createQueryClient } from '@/lib/api';
import { type AuthStore, createAuthStore } from '@/lib/supabase';

import { fakeSession, memoryStorage } from '../../lib/supabase/helpers';

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

describe('LoginPage', () => {
  it('shows the unavailable notice instead of forms when the build has no settings', () => {
    renderLogin(createAuthStore({ config: null, loadClient: () => Promise.reject(new Error()) }));
    expect(screen.getByRole('heading', { name: 'Sign-in is unavailable here' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeInTheDocument();
  });

  it('offers OAuth, password, email code and phone code to a signed-out visitor', async () => {
    renderLogin(storeWith(null));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Welcome back to the Arena.',
    );
    expect(screen.getByRole('button', { name: /Continue with Google/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Continue with GitHub/ })).toBeVisible();
    const tabs = screen.getAllByRole('tab').map(tab => tab.textContent);
    expect(tabs).toEqual(['Password', 'Email code', 'Phone code']);
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute(
      'autocomplete',
      'current-password',
    );
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password/',
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Phone code' }));
    expect(await screen.findByLabelText('Phone number')).toHaveAttribute('autocomplete', 'tel');
  });

  it('shows inline errors linked to their fields and focuses the first one', async () => {
    renderLogin(storeWith(null));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveFocus();
    const describedBy = email.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)).toHaveTextContent('Enter your email address.');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('toggles the password visibility with a pressed button', async () => {
    renderLogin(storeWith(null));
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute(
      'type',
      'password',
    );
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Password', { selector: 'input' })).toHaveAttribute(
      'type',
      'text',
    );
  });

  it('carries ?redirect= to the sign-up link', () => {
    renderLogin(storeWith(null), '/login/?redirect=%2Fleaderboard%2F');
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup/?redirect=%2Fleaderboard%2F',
    );
  });

  it('greets a signed-in visitor, who can continue or sign out', async () => {
    renderLogin(storeWith(fakeSession()), '/login/?redirect=%2Fmodels%2F');
    expect(await screen.findByRole('heading', { name: 'You are signed in' })).toBeVisible();
    expect(screen.getByText('ada@example.com')).toBeVisible();
    expect(screen.getByRole('link', { name: /Continue/ })).toHaveAttribute('href', '/models/');
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeVisible());
  });
});
