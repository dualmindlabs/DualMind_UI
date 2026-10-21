import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SettingsPage } from '@/features/settings';
import { createApiClient, createQueryClient } from '@/lib/api';
import { type AuthStore, createAuthStore } from '@/lib/supabase';

import { fakeSession, memoryStorage } from '../../lib/supabase/helpers';

// Slice S12: /settings/ for a signed-in user. Every section renders, and the device settings
// (theme, motion, default mode, send key, single-key shortcuts) apply at once and are stored
// under the keys the rest of the app reads.

const CONFIG = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};

function signedIn(): AuthStore {
  const session = fakeSession();
  const auth = {
    getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
  };
  return createAuthStore({
    config: CONFIG,
    loadClient: () => Promise.resolve({ auth } as never),
    localStorage: memoryStorage({ [CONFIG.storageKey]: '{}' }),
    sessionStorage: memoryStorage(),
    getLocation: () => ({ search: '', hash: '' }),
  });
}

function renderSettings(store: AuthStore) {
  return render(
    <MemoryRouter initialEntries={['/settings/']}>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <AuthProvider store={store}>
          <MotionProvider>
            <TooltipProvider>
              <CommandPaletteProvider>
                <SettingsPage />
              </CommandPaletteProvider>
            </TooltipProvider>
          </MotionProvider>
        </AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute('data-motion');
});

describe('SettingsPage', () => {
  it('shows every section with a section nav for a signed-in user', async () => {
    renderSettings(signedIn());
    expect(await screen.findByRole('heading', { level: 2, name: 'Profile' })).toBeVisible();
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    for (const name of ['Appearance', 'Arena', 'Keyboard shortcuts', 'Your data']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeVisible();
    }
    const nav = screen.getByRole('navigation', { name: 'Settings sections' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map(link => link.getAttribute('href')),
    ).toEqual(['#profile', '#appearance', '#arena', '#shortcuts', '#data']);

    expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveValue('Ada Lovelace');
    const email = screen.getByRole('textbox', { name: 'Email' });
    expect(email).toHaveValue('ada@example.com');
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Change password' })).toBeVisible();
    expect(screen.getAllByTestId('shortcut-table')).toHaveLength(3);
    expect(
      screen.getByRole('link', { name: /Email a deletion request/ }).getAttribute('href'),
    ).toMatch(/^mailto:privacy@dualmindlab\.tech\?subject=/);
  });

  it('applies and stores the device settings at once', async () => {
    const user = userEvent.setup();
    renderSettings(signedIn());
    await screen.findByRole('heading', { level: 2, name: 'Appearance' });

    const theme = screen.getByRole('group', { name: 'Theme' });
    await user.click(within(theme).getByRole('radio', { name: 'Light' }));
    expect(window.localStorage.getItem('dm.theme')).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');

    const motion = screen.getByRole('group', { name: 'Motion' });
    await user.click(within(motion).getByRole('radio', { name: 'Reduce' }));
    expect(window.localStorage.getItem('dm.motion')).toBe('reduce');
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduce');

    await user.click(screen.getByRole('radio', { name: 'Direct' }));
    expect(window.localStorage.getItem('dm.arena.mode')).toBe('direct');

    await user.click(screen.getByRole('radio', { name: 'Ctrl+Enter sends' }));
    expect(window.localStorage.getItem('dm.arena.send')).toBe('mod-enter');
    // The keyboard map follows: Enter is a new line now.
    expect(screen.getAllByText('New line')).toHaveLength(2);

    const shortcuts = screen.getByRole('switch', { name: 'Use single-key shortcuts' });
    expect(shortcuts).toBeChecked();
    await user.click(shortcuts);
    expect(window.localStorage.getItem('dm.arena.shortcuts')).toBe('off');
    expect(screen.getAllByText('Off').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Saved on this device').length).toBeGreaterThan(0);
  });

  it('explains when this build has no sign-in', () => {
    renderSettings(createAuthStore({ config: null, loadClient: () => Promise.reject(new Error()) }));
    expect(screen.getByRole('heading', { name: 'Sign-in is unavailable here' })).toBeVisible();
    expect(screen.queryByRole('heading', { level: 2, name: 'Profile' })).not.toBeInTheDocument();
  });
});
