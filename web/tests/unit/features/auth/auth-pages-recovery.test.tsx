import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { AuthCallbackPage, type CallbackUrl, SignupPage } from '@/features/auth';
import { createApiClient, createQueryClient } from '@/lib/api';
import { createAuthStore } from '@/lib/supabase';

import { memoryStorage } from '../../lib/supabase/helpers';

const CONFIG = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};

function setup(ui: (auth: ReturnType<typeof makeAuth>) => ReactElement, path: string) {
  const auth = makeAuth();
  const store = createAuthStore({
    config: CONFIG,
    loadClient: () => Promise.resolve({ auth } as never),
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
    getLocation: () => ({ search: '', hash: '' }),
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <AuthProvider store={store}>{ui(auth)}</AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
  return auth;
}

function makeAuth() {
  return {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
    resend: vi.fn((_params: unknown) => Promise.resolve({ error: null })),
    resetPasswordForEmail: vi.fn((_email: string, _options?: unknown) =>
      Promise.resolve({ error: null }),
    ),
  };
}

const EXPIRED: CallbackUrl['error'] = { code: 'otp_expired', description: 'Email link expired' };

function link(overrides: Partial<CallbackUrl>): CallbackUrl {
  return {
    type: null,
    hasTokens: false,
    hasCode: false,
    error: EXPIRED,
    welcome: false,
    redirect: null,
    ...overrides,
  };
}

describe('AuthCallbackPage with a link that did not work', () => {
  it('offers to resend the confirmation email and does it with the existing client call', async () => {
    const auth = setup(() => <AuthCallbackPage link={link({ type: 'signup' })} />, '/');
    expect(await screen.findByRole('heading', { name: 'This link did not work' })).toBeVisible();
    await userEvent.type(screen.getByLabelText('Your email'), 'Ada@Example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Resend the confirmation email' }));
    await waitFor(() => expect(auth.resend).toHaveBeenCalledTimes(1));
    expect(auth.resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'signup', email: 'ada@example.com' }),
    );
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(await screen.findByText(/We sent a new confirmation email/)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login/',
    );
  });

  it('sends a new reset link when the failed link was a recovery link', async () => {
    const auth = setup(() => <AuthCallbackPage link={link({ type: 'recovery' })} />, '/');
    await userEvent.type(await screen.findByLabelText('Your email'), 'ada@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send a new link' }));
    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(1));
    expect(auth.resetPasswordForEmail.mock.calls[0]?.[0]).toBe('ada@example.com');
    expect(auth.resend).not.toHaveBeenCalled();
  });

  it('asks for a valid email first and has the legal footer', async () => {
    const auth = setup(() => <AuthCallbackPage link={link({})} />, '/');
    await userEvent.click(await screen.findByRole('button', { name: /Resend the confirmation/ }));
    expect(screen.getByLabelText('Your email')).toHaveAttribute('aria-invalid', 'true');
    expect(auth.resend).not.toHaveBeenCalled();
    const legal = screen.getByRole('navigation', { name: 'Legal' });
    expect(legal).toHaveTextContent('Privacy');
    expect(legal).toHaveTextContent('Terms');
  });
});

describe('SignupPage', () => {
  it('is headed "Create your account" with the tagline as its subhead', async () => {
    setup(() => <SignupPage />, '/signup/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Create your account');
    expect(screen.getByText('Two models. One prompt. You decide.', { selector: 'p' })).toBeVisible();
  });
});
