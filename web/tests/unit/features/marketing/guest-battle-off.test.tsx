import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { GuestBattle } from '@/features/marketing/components/guest-battle';
import { createApiClient, createQueryClient } from '@/lib/api';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';

// The default build has every launch flag off: the guest battle renders nothing, loads no
// Turnstile and makes no request.
describe('GuestBattle with the flag off (the default)', () => {
  it('renders nothing and calls nothing', () => {
    const { fetch } = scriptedFetch(jsonResponse({}));
    const { container } = render(
      <MemoryRouter>
        <ApiProvider client={createApiClient({ fetch })} queryClient={createQueryClient()}>
          <GuestBattle />
        </ApiProvider>
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector('script[src*="challenges.cloudflare.com"]')).toBeNull();
  });
});
