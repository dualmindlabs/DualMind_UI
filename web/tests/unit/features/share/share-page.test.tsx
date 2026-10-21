import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { toast, Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SharePage } from '@/features/share';
import { createApiClient, createQueryClient } from '@/lib/api';
import { createAuthStore } from '@/lib/supabase';

import { jsonResponse } from '../../lib/api/helpers';

// Slice S11: the share page against a fake public API. Anonymous calls only: the page must work
// for anyone with the link, and show nothing about the owner.

const ID = '2d1b6f0e-8c3a-4f7e-9b1d-5a6c7e8f9a0b';

const THREAD = {
  threadId: ID,
  userId: 'owner-user-id-123',
  title: 'Explain recursion to a ten-year-old',
  mode: 'battle',
  visibility: 'unlisted',
  messageCount: 1,
  createdAt: '2026-10-21T10:00:00Z',
  updatedAt: '2026-10-21T10:05:00Z',
};

const row = (vote: string | null) => ({
  messageId: 'm1',
  threadId: ID,
  position: 0,
  promptText: 'Explain recursion to a ten-year-old',
  model1Name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  model2Name: 'groq/compound-mini',
  model1Response: 'A function that **calls itself**.',
  model2Response: 'Russian *nesting dolls*.',
  model1TimeMs: 1840,
  model2TimeMs: 2310,
  comparisonId: 'c1',
  voteChoice: vote,
  hasVoted: vote !== null,
});

const BOARD = {
  success: true,
  items: [
    {
      modelId: 'm-a',
      modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      displayName: 'Llama 3.3 70B',
      providerName: 'cloudflare',
      eloScore: 1100,
      eloRank: 1,
      totalWins: 1,
      totalLosses: 1,
      totalTies: 0,
      totalResponses: 2,
    },
  ],
};

type Answer = 'voted' | 'unvoted' | 'private' | 'offline';

function fakeFetch(answers: Answer[]) {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const fetch = (url: string, init: RequestInit) => {
    calls.push({ url, headers: new Headers(init.headers) });
    const path = new URL(url).pathname;
    if (path === '/api/arena/model-stats') return Promise.resolve(jsonResponse(BOARD));
    const answer = answers.length > 1 ? answers.shift()! : answers[0]!;
    if (answer === 'offline') return Promise.reject(new TypeError('Failed to fetch'));
    if (answer === 'private') {
      return Promise.resolve(new Response(null, { status: 401 }));
    }
    if (path.endsWith('/messages')) {
      return Promise.resolve(jsonResponse({ items: [row(answer === 'voted' ? 'right' : null)] }));
    }
    return Promise.resolve(jsonResponse(THREAD));
  };
  return { fetch, calls };
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

function renderPage(path: string, fetch: (url: string, init: RequestInit) => Promise<Response>) {
  const client = createApiClient({
    baseUrl: 'https://arena.test',
    fetch,
    retry: { maxRetries: 0 },
  });
  const store = createAuthStore({ config: null, loadClient: () => Promise.reject(new Error()) });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ApiProvider
        client={client}
        queryClient={createQueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AuthProvider store={store}>
          <MotionProvider>
            <TooltipProvider>
              <CommandPaletteProvider>
                <SharePage />
                <LocationProbe />
                <Toaster />
              </CommandPaletteProvider>
            </TooltipProvider>
          </MotionProvider>
        </AuthProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  toast.dismiss();
});

describe('SharePage', () => {
  it('shows a voted battle with the reveal: names, the pick and the verdict', async () => {
    const { fetch, calls } = fakeFetch(['voted']);
    renderPage(`/share/${ID}`, fetch);
    expect(screen.getByTestId('share-loading')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: THREAD.title })).toBeVisible();
    expect(screen.getByTestId('share-lead')).toHaveTextContent('a verdict was cast');
    const answerA = screen.getByRole('region', { name: /Answer A/ });
    const answerB = screen.getByRole('region', { name: /Answer B/ });
    expect(within(answerA).getByTestId('pane-model')).toHaveTextContent('Llama 3.3 70B');
    expect(within(answerB).getByTestId('pane-model')).toHaveTextContent('compound-mini');
    expect(answerB).toHaveAttribute('data-chosen');
    expect(within(answerB).getByText('Picked')).toBeVisible();
    expect(within(answerA).getByTestId('pane-meta')).toHaveTextContent('1.8 s');
    expect(screen.getByTestId('turn-verdict')).toHaveTextContent('Verdict: B is better');
    expect(screen.queryByText(/Your verdict|Your pick/)).not.toBeInTheDocument();
    expect(within(answerA).getByText('calls itself').tagName).toBe('STRONG');
    // Author-safe, and anonymous: no owner id on the page, no token sent.
    expect(document.body.textContent).not.toContain('owner-user-id-123');
    expect(calls.every(call => call.headers.get('authorization') === null)).toBe(true);
    // The call to action and the copy link.
    expect(screen.getAllByRole('link', { name: /Run your own battle/ })[0]).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeVisible();
    expect(document.title).toBe(`${THREAD.title} · DualMind Arena`);
  });

  it('keeps both models anonymous when nobody voted', async () => {
    const { fetch } = fakeFetch(['unvoted']);
    renderPage(`/share/${ID}`, fetch);
    expect(await screen.findByTestId('share-lead')).toHaveTextContent('Nobody voted');
    expect(screen.queryAllByTestId('pane-model')).toHaveLength(0);
    expect(screen.queryAllByTestId('pane-meta')).toHaveLength(0);
    expect(screen.getAllByText('Hidden: no vote')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/llama|compound/i);
  });

  it('says a private or missing link is unavailable', async () => {
    const { fetch } = fakeFetch(['private']);
    renderPage(`/share/${ID}`, fetch);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'This link is private or doesn’t exist.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Run your own battle' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Open it in your arena' })).not.toBeInTheDocument();
  });

  it('treats an address without an id as unavailable, without calling the API', () => {
    const { fetch, calls } = fakeFetch(['voted']);
    renderPage('/share/', fetch);
    expect(screen.getByTestId('share-unavailable')).toBeInTheDocument();
    expect(calls.filter(call => call.url.includes('/api/threads'))).toHaveLength(0);
  });

  it('explains a network failure and recovers with Try again', async () => {
    const user = userEvent.setup();
    const { fetch } = fakeFetch(['offline', 'offline', 'voted']);
    renderPage(`/share/${ID}`, fetch);
    const alert = await screen.findByTestId('share-error');
    expect(within(alert).getByRole('heading', { level: 1 })).toHaveTextContent(
      'This shared page did not load.',
    );
    await user.click(within(alert).getByRole('button', { name: /Try again/ }));
    expect(await screen.findByRole('heading', { level: 1, name: THREAD.title })).toBeVisible();
  });

  it('moves an old ?thread= link to the canonical address', async () => {
    const { fetch } = fakeFetch(['voted']);
    renderPage(`/share/?thread=${ID}`, fetch);
    expect(await screen.findByRole('heading', { level: 1, name: THREAD.title })).toBeVisible();
    expect(screen.getByTestId('location')).toHaveTextContent(`/share/${ID}`);
    expect(screen.getByTestId('location').textContent).not.toContain('?');
  });
});
