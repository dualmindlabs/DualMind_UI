import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LeaderboardPage, TABLE_QUERY } from '@/features/leaderboard';
import { createApiClient, createQueryClient } from '@/lib/api';

import board from '../../../fixtures/api/crowd-board.json';
import boardCode from '../../../fixtures/api/crowd-board-code.json';
import categories from '../../../fixtures/api/crowd-categories.json';
import v2 from '../../../fixtures/api/leaderboard-v2.recorded.json';
import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';

const pathOf = (url: string) => new URL(url, 'https://app.test').pathname;
const down = (status: number) =>
  jsonResponse({ success: false, error: 'Down', code: 'E' }, { status });

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: query === TABLE_QUERY,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
});

/** The page over a fake backend: `routes` maps a path to a reply, anything else answers 404. */
function renderWith(routes: Record<string, () => Response>) {
  const { fetch } = scriptedFetch(call => routes[pathOf(call.url)]?.() ?? down(404));
  const client = createApiClient({ fetch });
  const queryClient = createQueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/leaderboard/']}>
      <ApiProvider client={client} queryClient={queryClient}>
        <MotionProvider>
          <TooltipProvider>
            <CommandPaletteProvider>
              <LeaderboardPage />
            </CommandPaletteProvider>
          </TooltipProvider>
        </MotionProvider>
      </ApiProvider>
    </MemoryRouter>,
  );
}

describe('LeaderboardPage on the crowd board', () => {
  it('shows a rated model without a rank claim with no number, and "by rating"', async () => {
    renderWith({ '/api/leaderboard': () => jsonResponse(board) });
    const table = await screen.findByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    const unranked = rows.filter(row => row.querySelector('[data-rank-claim="none"]'));
    expect(unranked.length).toBeGreaterThan(0);
    for (const row of unranked) {
      expect(within(row).getByText('by rating')).toBeInTheDocument();
      expect(within(row).getAllByRole('cell')[0]?.textContent).not.toMatch(/\d/);
    }
  });

  it('renders the backend warnings', async () => {
    renderWith({
      '/api/leaderboard': () =>
        jsonResponse({ ...board, warnings: ['Showing the top 100 models only'], degraded: false }),
    });
    expect(await screen.findByTestId('crowd-warnings')).toHaveTextContent(
      'Showing the top 100 models only',
    );
  });

  it('says live ratings are unavailable on a 503, and shows the classic board', async () => {
    renderWith({ '/api/leaderboard': () => down(503), '/api/v2/leaderboard': () => jsonResponse(v2) });
    expect(await screen.findByTestId('board-fallback')).toHaveTextContent(
      'Live ratings are temporarily unavailable',
    );
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByTestId('crowd-note')).toBeNull();
  });

  it('falls back to the classic board on a 500 instead of an error page', async () => {
    renderWith({ '/api/leaderboard': () => down(500), '/api/v2/leaderboard': () => jsonResponse(v2) });
    expect(await screen.findByTestId('board-fallback')).toHaveTextContent('could not be loaded');
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('says nothing when the crowd board is simply off', async () => {
    renderWith({ '/api/v2/leaderboard': () => jsonResponse(v2) });
    await screen.findByRole('table');
    expect(screen.queryByTestId('board-fallback')).toBeNull();
  });

  it('labels a category board with its category, and the overall fallback without one', async () => {
    const user = userEvent.setup();
    renderWith({
      '/api/leaderboard': () => jsonResponse(board),
      '/api/leaderboard/categories': () => jsonResponse(categories),
      '/api/leaderboard/categories/code': () => jsonResponse(boardCode),
      '/api/leaderboard/categories/math': () => down(500),
    });
    await screen.findByRole('table');
    await user.click(await screen.findByRole('tab', { name: 'Code' }));
    await waitFor(() => expect(screen.getByTestId('crowd-note')).toHaveTextContent('in Code'));
    expect(screen.queryByTestId('category-fallback')).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Math' }));
    // The overall board is cached under Math: it must not claim to be Math's.
    expect(await screen.findByTestId('category-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('crowd-note')).not.toHaveTextContent('in Math');
    expect(screen.getByTestId('crowd-note')).toHaveTextContent('4,821');
  });
});
