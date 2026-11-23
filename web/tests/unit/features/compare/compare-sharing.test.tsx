import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CompareSharing } from '@/features/compare/components/compare-sharing';
import { ApiClientContext } from '@/hooks/use-api-client';
import { type CompareResult, createApiClient } from '@/lib/api';
import { compareResultSchema } from '@/lib/api/schemas/compare';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';

const ID = 'AbCdEfGhIjKlMnOpQrSt12';

function result(overrides: Record<string, unknown> = {}): CompareResult {
  return compareResultSchema.parse({
    shareId: ID,
    prompt: 'q',
    a: { modelName: 'a', answer: 'x' },
    b: { modelName: 'b', answer: 'y' },
    shared: false,
    expiresAt: '2026-12-22T10:00:00Z',
    ...overrides,
  });
}

function setup(
  replies: Parameters<typeof scriptedFetch>,
  props: { result: CompareResult; owner: boolean },
) {
  const { fetch, calls } = scriptedFetch(...replies);
  const client = createApiClient({ fetch, getAccessToken: () => 'token' });
  const onDeleted = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <CompareSharing {...props} onDeleted={onDeleted} />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return { calls, onDeleted };
}

describe('CompareSharing', () => {
  it('says plainly that a private result is private, and when it is deleted', () => {
    setup([jsonResponse({})], { result: result(), owner: true });
    expect(screen.getByRole('heading', { name: 'Private' })).toBeInTheDocument();
    const copy = screen.getByTestId('compare-privacy');
    expect(copy).toHaveTextContent('Only you can open this result');
    expect(copy).toHaveTextContent('Dec 22, 2026');
    expect(screen.queryByRole('textbox', { name: 'Share link' })).not.toBeInTheDocument();
  });

  it('turns sharing on, shows the link, and announces it', async () => {
    const user = userEvent.setup();
    const { calls } = setup([jsonResponse({ shared: true })], { result: result(), owner: true });
    await user.click(screen.getByRole('switch', { name: /anyone with the link/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Shared by link' })).toBeInTheDocument(),
    );
    expect(calls[0]?.init.method).toBe('PUT');
    expect(calls[0]?.body).toEqual({ shared: true });
    expect(screen.getByRole('status')).toHaveTextContent('Sharing is on');
    expect(screen.getByRole('textbox', { name: 'Share link' })).toHaveValue(
      `${window.location.origin}/compare/${ID}`,
    );
  });

  it('leaves the switch where it was when the change fails, and says why', async () => {
    const user = userEvent.setup();
    setup([jsonResponse({ code: 'COMPARE_NOT_FOUND' }, { status: 404 })], {
      result: result(),
      owner: true,
    });
    await user.click(screen.getByRole('switch', { name: /anyone with the link/i }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('not saved'));
    expect(screen.getByRole('heading', { name: 'Private' })).toBeInTheDocument();
  });

  it('asks before deleting, then deletes', async () => {
    const user = userEvent.setup();
    const { calls, onDeleted } = setup([new Response(null, { status: 204 })], {
      result: result({ shared: true }),
      owner: true,
    });
    await user.click(screen.getByRole('button', { name: 'Delete this result' }));
    expect(calls).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('button', { name: 'Delete this result' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete this result' }));
    await user.click(screen.getByRole('button', { name: 'Delete for good' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(calls[0]?.init.method).toBe('DELETE');
  });

  it('shows no owner controls to a reader', () => {
    setup([jsonResponse({})], { result: result({ shared: true }), owner: false });
    expect(screen.getByRole('heading', { name: 'Shared by link' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('says so when the result was not stored', () => {
    setup([jsonResponse({})], { result: result({ shareId: null, expiresAt: null }), owner: true });
    expect(screen.getByRole('heading', { name: 'Not saved' })).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
