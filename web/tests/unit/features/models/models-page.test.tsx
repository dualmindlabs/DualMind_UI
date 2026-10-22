import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ModelsPage } from '@/features/models';
import { createApiClient, createQueryClient } from '@/lib/api';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/models/']}>
      <ApiProvider
        client={createApiClient({ mock: true })}
        queryClient={createQueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MotionProvider>
          <TooltipProvider>
            <CommandPaletteProvider>
              <ModelsPage />
            </CommandPaletteProvider>
          </TooltipProvider>
        </MotionProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

const cards = async () =>
  within(await screen.findByRole('list', { name: 'Models' })).getAllByRole('listitem');

describe('ModelsPage', () => {
  it('replaces the static article with a live directory', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Every model in the Arena.',
    );
    expect(screen.queryByText(/GPT-4|Claude 3|Gemini 1\.5/)).not.toBeInTheDocument();
    expect(await cards()).toHaveLength(7);
    expect(screen.getByRole('button', { name: 'Compound Mini' })).toBeInTheDocument();
  });

  it('filters by provider and sorts by name', async () => {
    const user = userEvent.setup();
    renderPage();
    await cards();
    await user.click(screen.getByRole('button', { name: /^Google/ }));
    await waitFor(async () => expect(await cards()).toHaveLength(2));

    await user.click(screen.getByRole('button', { name: /^All/ }));
    await user.click(screen.getByRole('button', { name: 'A to Z' }));
    const first = (await cards())[0];
    expect(first).toHaveTextContent('Compound Mini');
  });

  it('opens the shared details sheet, which links back to the leaderboard', async () => {
    const user = userEvent.setup();
    renderPage();
    await cards();
    await user.click(screen.getByRole('button', { name: 'Gemma 3 1B IT' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Gemma 3 1B IT');
    expect(within(dialog).getByRole('link', { name: 'Open the leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard/',
    );
    expect(within(dialog).getByText('Rank 07 of 7')).toBeInTheDocument();
  });
});
