import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { PrivateArenaPage } from '@/features/private-arena';
import { createApiClient, createQueryClient } from '@/lib/api';
import { type AuthStore, createAuthStore } from '@/lib/supabase';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';
import { fakeSession, memoryStorage } from '../../lib/supabase/helpers';

// Cycle 2: the private arena (flag mocked on here; the default build has it off): create a prompt
// set, run blind battles, vote, see the models, read your own board. Pro is only a placeholder.

vi.mock('@/hooks/use-features', () => ({
  useFeatures: () => ({
    guestBattle: false,
    privateArena: true,
    turnstileSiteKey: null,
    loading: false,
  }),
}));

const CONFIG = {
  url: 'https://abcd.supabase.co',
  anonKey: 'anon',
  projectRef: 'abcd',
  storageKey: 'sb-abcd-auth-token',
};

function signedInStore(): AuthStore {
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

function renderPage(fetch: ReturnType<typeof scriptedFetch>['fetch']) {
  return render(
    <MemoryRouter initialEntries={['/private/']}>
      <ApiProvider
        client={createApiClient({ fetch, getAccessToken: () => 'token-1' })}
        queryClient={createQueryClient()}
      >
        <AuthProvider store={signedInStore()}>
          <PrivateArenaPage />
        </AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

const arena = { id: 'a1', name: 'Support replies', promptCount: 2, battlesDone: 0 };

describe('PrivateArenaPage', () => {
  it('lists your arena, runs a blind battle, reveals the models after the vote', async () => {
    const { fetch, calls } = scriptedFetch(call => {
      const { url } = call;
      const method = call.init.method;
      if (url === '/api/private-arenas' && method === 'GET') return jsonResponse([arena]);
      if (url.endsWith('/battle')) {
        return jsonResponse({
          battleId: 'b1',
          agent1: { text: 'Left answer', model: { name: 'vendor/hidden-one' } },
          agent2: { text: 'Right answer', model: { name: 'vendor/hidden-two' } },
        });
      }
      if (url.endsWith('/vote')) {
        return jsonResponse({
          models: { left: { name: 'vendor/alpha-1' }, right: { name: 'vendor/beta-2' } },
        });
      }
      if (url.endsWith('/board')) {
        return jsonResponse([{ model: 'vendor/alpha-1', wins: 1, losses: 0, ties: 0, battles: 1 }]);
      }
      return jsonResponse({});
    });
    renderPage(fetch);

    const runner = await screen.findByTestId('private-runner');
    expect(within(runner).getByRole('heading', { name: 'Support replies' })).toBeVisible();
    expect(screen.getByTestId('private-progress')).toHaveTextContent('0 of 2 prompts judged');

    await userEvent.click(screen.getByRole('button', { name: 'Run the first battle' }));
    const left = await screen.findByRole('article', { name: 'Answer A' });
    expect(left).toHaveTextContent('Left answer');
    // Blind: the names the API sent with the battle are never shown.
    expect(document.body).not.toHaveTextContent('hidden-one');
    expect(calls.find(call => call.url.endsWith('/battle'))?.body).toEqual({ promptIndex: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Both are bad' }));
    await waitFor(() => expect(screen.getByRole('article', { name: 'Answer A' })).toHaveTextContent('Alpha'));
    expect(screen.getByRole('article', { name: 'Answer B' })).toHaveTextContent('Beta');
    expect(calls.find(call => call.url.endsWith('/vote'))?.body).toEqual({
      battleId: 'b1',
      choice: 'both_bad',
    });
    expect(screen.getByTestId('private-progress')).toHaveTextContent('1 of 2 prompts judged');
    expect(screen.getByRole('button', { name: 'Next prompt' })).toBeVisible();
    expect(await screen.findByTestId('private-board')).toHaveTextContent('Alpha');
  });

  it('creates an arena from one prompt per line and checks the form first', async () => {
    const { fetch, calls } = scriptedFetch(call => {
      if (call.init.method === 'POST') return jsonResponse({ id: 'a2' });
      return jsonResponse([]);
    });
    renderPage(fetch);
    expect(await screen.findByTestId('private-empty')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Create arena' }));
    expect(screen.getByText('Give the arena a name.')).toBeVisible();
    expect(screen.getByText('Add at least one prompt, one per line.')).toBeVisible();
    expect(calls.some(call => call.init.method === 'POST')).toBe(false);

    await userEvent.type(screen.getByLabelText('Name'), 'Docs');
    await userEvent.type(screen.getByLabelText('Prompts'), 'First{enter}Second');
    await userEvent.click(screen.getByRole('button', { name: 'Create arena' }));
    await waitFor(() => expect(calls.some(call => call.init.method === 'POST')).toBe(true));
    expect(calls.find(call => call.init.method === 'POST')?.body).toEqual({
      name: 'Docs',
      prompts: ['First', 'Second'],
    });
  });

  it('stops at three arenas and shows Pro only as a placeholder', async () => {
    const three = [1, 2, 3].map(n => ({ ...arena, id: `a${n}`, name: `Set ${n}` }));
    const { fetch } = scriptedFetch(jsonResponse(three));
    renderPage(fetch);
    expect(await screen.findByRole('tab', { name: 'Set 3' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Create arena' })).toBeDisabled();
    const pro = screen.getByTestId('private-pro');
    expect(pro).toHaveTextContent('Pro (coming soon)');
    expect(pro).toHaveTextContent('Nothing to buy today');
    expect(screen.queryByRole('button', { name: /upgrade|subscribe|pay/i })).not.toBeInTheDocument();
  });
});
