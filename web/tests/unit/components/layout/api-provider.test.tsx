import { useQuery } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { useApiClient } from '@/hooks/use-api-client';
import { type ApiClient, createApiClient, createQueryClient, leaderboardQuery } from '@/lib/api';

function Leaders() {
  const api = useApiClient();
  const { data, status } = useQuery(leaderboardQuery(api));
  if (status !== 'success') return <p>{status}</p>;
  return (
    <ul aria-label="Leaders">
      {data.slice(0, 2).map(stat => (
        <li key={stat.modelId}>{stat.displayName}</li>
      ))}
    </ul>
  );
}

function MockFlag() {
  return <p>{useApiClient().isMock ? 'mock' : 'live'}</p>;
}

describe('ApiProvider', () => {
  it('gives components the API client and a query cache', async () => {
    render(
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <Leaders />
      </ApiProvider>,
    );
    expect(screen.getByText('pending')).toBeInTheDocument();
    const items = await screen.findAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual([
      'llama-3.3-70b-instruct-fp8-fast',
      'llama-3.1-70b-instruct',
    ]);
  });

  it('keeps the same client across renders', () => {
    const seen: ApiClient[] = [];
    function Spy() {
      seen.push(useApiClient());
      return null;
    }
    const client = createApiClient({ mock: true });
    const { rerender } = render(
      <ApiProvider client={client}>
        <Spy />
      </ApiProvider>,
    );
    rerender(
      <ApiProvider client={createApiClient({ mock: true })}>
        <Spy />
      </ApiProvider>,
    );
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.every(item => item === client)).toBe(true);
  });

  it('builds the client from the environment by default (live, same-origin)', () => {
    render(
      <ApiProvider>
        <MockFlag />
      </ApiProvider>,
    );
    expect(screen.getByText('live')).toBeInTheDocument();
  });
});

describe('useApiClient', () => {
  it('fails clearly outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<MockFlag />)).toThrow(/needs <ApiProvider>/);
  });
});
