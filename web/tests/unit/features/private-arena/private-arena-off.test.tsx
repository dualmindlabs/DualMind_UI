import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PrivateArenaPage } from '@/features/private-arena';
import { createApiClient, createQueryClient } from '@/lib/api';
import { createAuthStore } from '@/lib/supabase';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';

// The default build has the flag off: the page says so, and nothing is requested.
describe('PrivateArenaPage with the flag off (the default)', () => {
  it('shows the "not open yet" notice and makes no private-arena request', () => {
    const { fetch } = scriptedFetch(jsonResponse([]));
    render(
      <MemoryRouter initialEntries={['/private/']}>
        <ApiProvider client={createApiClient({ fetch })} queryClient={createQueryClient()}>
          <AuthProvider
            store={createAuthStore({ config: null, loadClient: () => Promise.reject(new Error()) })}
          >
            <MotionProvider>
              <TooltipProvider>
                <CommandPaletteProvider>
                  <PrivateArenaPage />
                </CommandPaletteProvider>
              </TooltipProvider>
            </MotionProvider>
          </AuthProvider>
        </ApiProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('private-notice')).toHaveTextContent('not open yet');
    expect(screen.queryByTestId('private-pro')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
