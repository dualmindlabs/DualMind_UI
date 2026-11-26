import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { GUEST_SIGNUP_HREF, GuestBattle } from '@/features/marketing/components/guest-battle';
import { createApiClient, createQueryClient } from '@/lib/api';
import { PROMPT_DRAFT_KEY } from '@/lib/session/prompt-draft';
import { renderTurnstile } from '@/lib/turnstile';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';

// Cycle 2: "try one battle without an account". The Turnstile widget is mocked; the API call is a
// scripted fetch. No model name may ever show, even when the API sends one.

vi.mock('@/hooks/use-features', () => ({
  useFeatures: () => ({
    guestBattle: true,
    privateArena: false,
    turnstileSiteKey: '0xSITEKEY',
    loading: false,
  }),
}));

// "Battles left today" has its own tests (tests/unit/lib/api/launch.test.ts, use-quota.test.tsx);
// here it is a controllable stub so the scripted replies below stay in call order.
interface QuotaStub {
  guest: { enabled: boolean; limit: number; remaining: number } | null;
  privateArena: null;
  refresh: () => void;
}
const quotaState = vi.hoisted(() => {
  const value: QuotaStub = { guest: null, privateArena: null, refresh: () => {} };
  return { value };
});
vi.mock('@/hooks/use-quota', () => ({ useQuota: () => quotaState.value }));

vi.mock('@/lib/turnstile', () => ({
  renderTurnstile: vi.fn(
    (_container: HTMLElement, _key: string, onToken: (t: string | null) => void) => {
      onToken('turnstile-token');
      return Promise.resolve({ reset: vi.fn(), remove: vi.fn() });
    },
  ),
}));

const assign = vi.fn();

beforeEach(() => {
  vi.mocked(renderTurnstile).mockClear();
  assign.mockClear();
  window.sessionStorage.clear();
  quotaState.value = { guest: null, privateArena: null, refresh: () => {} };
});

function renderGuest(...replies: Parameters<typeof scriptedFetch>) {
  const { fetch, calls } = scriptedFetch(...replies);
  render(
    <MemoryRouter>
      <ApiProvider client={createApiClient({ fetch })} queryClient={createQueryClient()}>
        <GuestBattle navigate={assign} />
      </ApiProvider>
    </MemoryRouter>,
  );
  return calls;
}

describe('GuestBattle', () => {
  it('shows no counter without the quota endpoint, and the count when it answers', () => {
    renderGuest(jsonResponse({}));
    expect(screen.queryByTestId('battles-left')).toBeNull();
  });

  it('shows "battles left today" from the quota', () => {
    quotaState.value = {
      guest: { enabled: true, limit: 3, remaining: 2 },
      privateArena: null,
      refresh: () => {},
    };
    renderGuest(jsonResponse({}));
    expect(screen.getByTestId('battles-left')).toHaveTextContent('2 of 3 free battles left today');
  });

  it('loads the Turnstile check only when the visitor shows interest', async () => {
    renderGuest(jsonResponse({}));
    expect(renderTurnstile).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('Your prompt for the free battle'));
    await waitFor(() => expect(renderTurnstile).toHaveBeenCalledTimes(1));
    expect(vi.mocked(renderTurnstile).mock.calls[0]?.[1]).toBe('0xSITEKEY');
  });

  it('runs one battle with the token, shows two answers and no model name, then asks to sign up', async () => {
    const calls = renderGuest(
      jsonResponse({
        comparisonId: 'c1',
        agent1: { message: 'The first answer', model: { name: 'vendor/secret-one' } },
        agent2: { message: 'The second answer', model: { name: 'vendor/secret-two' } },
      }),
    );
    const input = screen.getByLabelText('Your prompt for the free battle');
    await userEvent.type(input, 'What is recursion?');
    const run = screen.getByRole('button', { name: 'Run the battle' });
    await waitFor(() => expect(run).toBeEnabled());
    await userEvent.click(run);

    const result = await screen.findByTestId('guest-battle-result');
    expect(result).toHaveTextContent('The first answer');
    expect(result).toHaveTextContent('The second answer');
    expect(document.body).not.toHaveTextContent('secret-one');
    expect(document.body).not.toHaveTextContent('secret-two');
    expect(calls[0]?.url).toBe('/api/arena/guest-battle');
    expect(calls[0]?.body).toEqual({
      prompt: 'What is recursion?',
      turnstileToken: 'turnstile-token',
    });
    expect(calls[0]?.headers.get('authorization')).toBeNull();

    await userEvent.click(
      screen.getByRole('button', { name: 'Sign up to run it as a rated battle' }),
    );
    expect(assign).toHaveBeenCalledWith(GUEST_SIGNUP_HREF);
    expect(window.sessionStorage.getItem(PROMPT_DRAFT_KEY)).toContain('What is recursion?');
  });

  it('keeps the button off until there is a prompt and a token, and caps the prompt at 500', () => {
    renderGuest(jsonResponse({}));
    const input = screen.getByLabelText('Your prompt for the free battle');
    expect(input).toHaveAttribute('maxlength', '500');
    expect(screen.getByRole('button', { name: 'Run the battle' })).toBeDisabled();
  });

  it('says what went wrong', async () => {
    renderGuest(jsonResponse({ code: 'TURNSTILE_FAILED', message: 'no' }, { status: 403 }));
    await userEvent.type(screen.getByLabelText('Your prompt for the free battle'), 'Hello');
    const run = screen.getByRole('button', { name: 'Run the battle' });
    await waitFor(() => expect(run).toBeEnabled());
    await userEvent.click(run);
    expect(await screen.findByTestId('guest-battle-status')).toHaveTextContent(
      /check did not pass/,
    );
  });
});
