import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { ArenaProvider } from '@/features/arena/components/arena-provider';
import { useDraft } from '@/features/arena/hooks/use-draft';
import { createApiClient, createQueryClient } from '@/lib/api';
import { PROMPT_DRAFT_KEY, savePromptDraft } from '@/lib/session/prompt-draft';

function Box() {
  const { draft } = useDraft();
  return <output data-testid="draft">{draft}</output>;
}

function renderArena() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <QueryClientProvider client={new QueryClient()}>
          <ArenaProvider>
            <Box />
          </ArenaProvider>
        </QueryClientProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

afterEach(() => window.sessionStorage.clear());

describe('ArenaProvider and the prompt typed on the landing page', () => {
  it('opens with the kept prompt in the box and takes it out of the tab', async () => {
    savePromptDraft('Which is bigger, 9.11 or 9.9?');
    renderArena();
    expect(screen.getByTestId('draft')).toHaveTextContent('Which is bigger, 9.11 or 9.9?');
    await waitFor(() => expect(window.sessionStorage.getItem(PROMPT_DRAFT_KEY)).toBeNull());
  });

  it('starts with an empty box when nothing was kept', () => {
    renderArena();
    expect(screen.getByTestId('draft')).toBeEmptyDOMElement();
  });
});
