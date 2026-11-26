import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { Composer } from '@/features/arena/components/composer';
import { DraftContext } from '@/features/arena/hooks/use-draft';
import { createApiClient, createQueryClient, MAX_PROMPT_CHARS } from '@/lib/api';

import { FakeArena } from './arena-context';

// The arena's prompt box has the same 8,000-character limit as Compare, with a counter that shows
// once the box is nearly full, and Send stays off beyond it.

function renderComposer(draft: string) {
  const onSend = vi.fn();
  render(
    <MemoryRouter>
      <ApiProvider client={createApiClient({ mock: true })} queryClient={createQueryClient()}>
        <FakeArena>
          <DraftContext.Provider value={{ draft, setDraft: vi.fn() }}>
            <Composer onSend={onSend} />
          </DraftContext.Provider>
        </FakeArena>
      </ApiProvider>
    </MemoryRouter>,
  );
  return onSend;
}

describe('the arena prompt box limit', () => {
  it('shows no count for a short prompt', () => {
    renderComposer('Explain recursion');
    expect(screen.queryByTestId('prompt-count')).toBeNull();
    expect(screen.getByTestId('composer-send')).toBeEnabled();
  });

  it('shows the count near the limit and still allows sending', () => {
    renderComposer('a'.repeat(MAX_PROMPT_CHARS - 10));
    expect(screen.getByTestId('prompt-count')).toHaveTextContent('7,990 / 8,000');
    expect(screen.getByTestId('composer-send')).toBeEnabled();
  });

  it('says it is too long and turns Send off beyond the limit', () => {
    renderComposer('a'.repeat(MAX_PROMPT_CHARS + 1));
    expect(screen.getByTestId('prompt-count')).toHaveTextContent('Too long to send');
    // The live region speaks once, with text that does not change per keystroke; no alert role.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Too long to send. Shorten your prompt');
    expect(screen.getByTestId('composer-send')).toBeDisabled();
  });
});
