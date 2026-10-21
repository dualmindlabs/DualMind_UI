import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '@/lib/api';
import { createLazyApiClient } from '@/lib/api/lazy-client';

function fakeClient(): ApiClient {
  return {
    getLeaderboard: vi.fn(() => Promise.resolve(['row'])),
    streamChat: async function* () {
      yield await Promise.resolve('a');
      yield 'b';
    },
  } as unknown as ApiClient;
}

describe('createLazyApiClient', () => {
  it('answers baseUrl and isMock without loading the client', () => {
    const load = vi.fn();
    const client = createLazyApiClient({ load, baseUrl: '/x', isMock: true });
    expect(client.baseUrl).toBe('/x');
    expect(client.isMock).toBe(true);
    expect(load).not.toHaveBeenCalled();
  });

  it('loads once on the first call and forwards arguments and results', async () => {
    const real = fakeClient();
    const load = vi.fn(() => Promise.resolve(real));
    const client = createLazyApiClient({ load, baseUrl: '', isMock: false });
    const options = { signal: new AbortController().signal };
    await expect(client.getLeaderboard(options)).resolves.toEqual(['row']);
    await client.getLeaderboard();
    expect(load).toHaveBeenCalledTimes(1);
    expect(real.getLeaderboard).toHaveBeenCalledWith(options);
  });

  it('streams through the real client', async () => {
    const client = createLazyApiClient({
      load: () => Promise.resolve(fakeClient()),
      baseUrl: '',
      isMock: false,
    });
    const seen: unknown[] = [];
    for await (const event of client.streamChat({} as never)) seen.push(event);
    expect(seen).toEqual(['a', 'b']);
  });
});
