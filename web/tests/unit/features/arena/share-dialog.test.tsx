import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { toast, Toaster } from '@/components/ui/sonner';
import { ShareDialog } from '@/features/arena/components/share-dialog';
import { createApiClient, createQueryClient } from '@/lib/api';

import { jsonResponse, type RecordedCall } from '../../lib/api/helpers';

// Slice S11: the share dialog against a fake API (visibility read, PATCH, the public_sharing flag).

const THREAD = {
  threadId: 't-recursion',
  userId: 'u1',
  title: 'Explain recursion to a ten-year-old',
  mode: 'battle',
  visibility: 'private',
  messageCount: 2,
};

interface FakeApi {
  calls: RecordedCall[];
  visibility: string;
  failPatch: boolean;
  flag: boolean;
  /** The thread read never answers (the loading state). */
  hangThread: boolean;
}

function fakeApi(): { api: FakeApi; fetch: (url: string, init: RequestInit) => Promise<Response> } {
  const api: FakeApi = {
    calls: [],
    visibility: 'private',
    failPatch: false,
    flag: true,
    hangThread: false,
  };
  const fetch = (url: string, init: RequestInit) => {
    const body = typeof init.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined;
    api.calls.push({ url, init, headers: new Headers(init.headers), body });
    const path = new URL(url).pathname;
    const method = init.method ?? 'GET';
    if (path === '/api/settings/feature-flag/public_sharing') {
      return Promise.resolve(jsonResponse({ key: 'public_sharing', enabled: api.flag }));
    }
    if (path === '/api/threads/t-recursion/visibility' && method === 'PATCH') {
      if (api.failPatch) {
        return Promise.resolve(
          jsonResponse({ success: false, error: 'Boom', code: 'INTERNAL' }, { status: 400 }),
        );
      }
      api.visibility = (body as { visibility: string }).visibility;
      return Promise.resolve(
        jsonResponse({ success: true, message: 'ok', visibility: api.visibility }),
      );
    }
    if (path === '/api/threads/t-recursion') {
      if (api.hangThread) return new Promise<Response>(() => {});
      return Promise.resolve(jsonResponse({ ...THREAD, visibility: api.visibility }));
    }
    return Promise.resolve(jsonResponse({ success: false }, { status: 404 }));
  };
  return { api, fetch };
}

function renderDialog(fetch: (url: string, init: RequestInit) => Promise<Response>) {
  const client = createApiClient({
    baseUrl: 'https://arena.test',
    fetch,
    getAccessToken: () => 'owner-token',
  });
  const onClose = vi.fn();
  render(
    <ApiProvider
      client={client}
      queryClient={createQueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ShareDialog threadId="t-recursion" onClose={onClose} />
      <Toaster />
    </ApiProvider>,
  );
  return { onClose };
}

const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  toast.dismiss();
  writeText.mockClear();
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    configurable: true,
    writable: true,
  });
});

describe('ShareDialog', () => {
  it('shows a loading state until the thread is read', async () => {
    const { api, fetch } = fakeApi();
    api.hangThread = true;
    renderDialog(fetch);
    const dialog = await screen.findByRole('dialog', { name: 'Share this thread' });
    expect(within(dialog).getByText('Loading the sharing settings')).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument();
  });

  it('shows a private thread with the link turned off', async () => {
    const { fetch } = fakeApi();
    renderDialog(fetch);
    expect(await screen.findByRole('dialog', { name: 'Share this battle' })).toBeVisible();
    expect(screen.getByRole('radio', { name: /Private/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Unlisted/ })).not.toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeDisabled();
    expect(screen.getByText('Choose Unlisted or Public to turn the link on.')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Open the page/ })).not.toBeInTheDocument();
  });

  it('saves a new visibility at once, then copies the link with a toast', async () => {
    const user = userEvent.setup();
    const { api, fetch } = fakeApi();
    renderDialog(fetch);
    await user.click(await screen.findByRole('radio', { name: /Unlisted/ }));
    expect(
      await screen.findByText('Unlisted: anyone with the link can open it now.'),
    ).toBeInTheDocument();
    const patch = api.calls.find(call => call.init.method === 'PATCH');
    expect(patch?.url).toBe('https://arena.test/api/threads/t-recursion/visibility');
    expect(patch?.body).toEqual({ visibility: 'unlisted' });
    expect(patch?.headers.get('authorization')).toBe('Bearer owner-token');
    await waitFor(() => expect(screen.getByRole('radio', { name: /Unlisted/ })).toBeChecked());

    const link = screen.getByRole('textbox', { name: 'Link' });
    expect(link).toBeEnabled();
    expect(link).toHaveValue(`${window.location.origin}/share/t-recursion`);
    expect(screen.getByRole('link', { name: /Open the page/ })).toHaveAttribute(
      'href',
      '/share/t-recursion',
    );

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    // user-event installs its own clipboard; read the link back from it.
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/share/t-recursion`,
    );
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copied' })).toBeVisible();
  });

  it('keeps the old choice and says so when the change fails', async () => {
    const user = userEvent.setup();
    const { api, fetch } = fakeApi();
    api.failPatch = true;
    renderDialog(fetch);
    await user.click(await screen.findByRole('radio', { name: /Public/ }));
    expect(await screen.findByText('Could not change who can open it')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Private/ })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Link' })).toBeDisabled();
  });

  it('warns when sharing is switched off on the server', async () => {
    const { api, fetch } = fakeApi();
    api.flag = false;
    api.visibility = 'public';
    renderDialog(fetch);
    expect(await screen.findByRole('note')).toHaveTextContent('Sharing is switched off');
  });

  it('offers the system share sheet where the browser has one', async () => {
    const user = userEvent.setup();
    const share = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
    const { api, fetch } = fakeApi();
    api.visibility = 'unlisted';
    renderDialog(fetch);
    await user.click(await screen.findByRole('button', { name: 'Share…' }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ url: `${window.location.origin}/share/t-recursion` }),
    );
  });
});
