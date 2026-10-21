import { useMutation, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { toast, Toaster } from '@/components/ui/sonner';
import { useApiClient } from '@/hooks/use-api-client';
import { createApiClient, leaderboardQuery, startBattleMutation } from '@/lib/api';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';

// BE-3: a 429 from the Worker is shown to the person as one friendly toast. The Worker's answer is
// mocked here with the exact shape server/rate-limit.js sends.

const limited = () =>
  jsonResponse(
    {
      type: 'https://arena.dualmindlab.tech/problems/rate_limited',
      title: 'Too many requests',
      status: 429,
      detail: 'Too many battles. Try again in 60 seconds.',
      instance: '/api/arena/dualchat',
      requestId: 'req-12345678',
      retryAfter: 60,
    },
    { status: 429, headers: { 'content-type': 'application/problem+json', 'retry-after': '60' } },
  );

function Battle() {
  const api = useApiClient();
  const battle = useMutation(startBattleMutation(api));
  return (
    <button type="button" onClick={() => battle.mutate({ prompt: 'hello' })}>
      Start battle
    </button>
  );
}

function Leaders() {
  const api = useApiClient();
  useQuery({ ...leaderboardQuery(api), retry: false });
  return null;
}

function renderApp(fetch: ReturnType<typeof scriptedFetch>['fetch'], child: React.ReactNode) {
  const client = createApiClient({ baseUrl: 'https://arena.test', fetch });
  return render(
    <ApiProvider client={client}>
      {child}
      <Toaster />
    </ApiProvider>,
  );
}

describe('429 toast', () => {
  afterEach(() => {
    toast.dismiss();
  });

  it('shows the wait time when a battle is rate limited, and sends it once (no retry)', async () => {
    const { fetch, calls } = scriptedFetch(limited());
    renderApp(fetch, <Battle />);
    await userEvent.click(screen.getByRole('button', { name: 'Start battle' }));
    // The first toast loads the Sonner chunk on demand, which can take a while on a cold runner.
    expect(
      await screen.findByText(
        'Too many requests. Try again in 60 seconds.',
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });

  it('shows the toast for a rate limited read after its attempts', async () => {
    const { fetch } = scriptedFetch(limited());
    renderApp(fetch, <Leaders />);
    await waitFor(
      () =>
        expect(screen.getByText('Too many requests. Try again in 60 seconds.')).toBeInTheDocument(),
      { timeout: 4000 },
    );
  });

  it('stays quiet for other errors', async () => {
    const { fetch } = scriptedFetch(jsonResponse({ error: 'bad_gateway' }, { status: 502 }));
    renderApp(fetch, <Battle />);
    await userEvent.click(screen.getByRole('button', { name: 'Start battle' }));
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(screen.queryByText(/Too many requests/)).not.toBeInTheDocument();
  });
});
