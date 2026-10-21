import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

import { ApiProvider } from '@/components/layout/api-provider';
import { CommandPaletteProvider } from '@/components/layout/command-palette-provider';
import { MotionProvider } from '@/components/motion/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LeaderboardPage, TABLE_QUERY } from '@/features/leaderboard';
import { createApiClient, createQueryClient, type MockScenario } from '@/lib/api';

let scenario: MockScenario = 'ok';
let wide = true;

/** matchMedia that answers the table breakpoint with `wide` and everything else with false. */
function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: query === TABLE_QUERY ? wide : false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  });
}

function renderPage() {
  const client = createApiClient({ mock: { getScenario: () => scenario } });
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

const table = () => screen.findByRole('table');
const bodyRows = async () =>
  within(await table())
    .getAllByRole('row')
    .slice(1);
const rowNames = async () =>
  (await bodyRows()).map(
    row => within(row).getByRole('rowheader').querySelector('button')?.textContent,
  );

beforeEach(() => {
  scenario = 'ok';
  wide = true;
  installMatchMedia();
});

describe('LeaderboardPage', () => {
  it('shows the prerendered parts at once: one h1, the methodology, a loading state', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Every model, ranked by blind votes.',
    );
    expect(screen.getByRole('heading', { name: /How to read the board/ })).toBeInTheDocument();
    expect(screen.getByText('Loading the leaderboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How ratings work/ })).toHaveAttribute(
      'href',
      '/how-it-works/#rating',
    );
  });

  it('loads the board without a sign-in: podium, table rows, provisional badges', async () => {
    renderPage();
    const rows = await bodyRows();
    expect(rows).toHaveLength(7);
    const podium = screen.getByRole('list', { name: 'Top three models' });
    expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
    // The leader has 96 battles, so it is provisional, like the two Gemma models.
    expect(within(rows[0] as HTMLElement).getByText('Provisional')).toBeInTheDocument();
    // Three in the table, and the leader's card on the podium.
    expect(screen.getAllByText('Provisional', { selector: 'span[data-provisional]' })).toHaveLength(
      4,
    );
    expect(screen.getByText(/Demo data/)).toBeInTheDocument();
  });

  it('sorts when a column header is pressed, and says so with aria-sort', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    const battles = screen.getByRole('button', { name: 'Battles' });
    const header = battles.closest('th');
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('button', { name: 'Rank' }).closest('th')).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await user.click(battles);
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect((await rowNames())[0]).toBe('llama-3.1-70b-instruct');

    await user.click(battles);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect((await rowNames())[0]).toBe('Gemma 3n E2B IT');
  });

  it('searches and filters by provider, and reports the count', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await user.type(screen.getByRole('searchbox', { name: 'Search models' }), 'gemma');
    await waitFor(async () => expect(await bodyRows()).toHaveLength(2));
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 2 of 7 models');

    await user.click(screen.getByRole('button', { name: 'Clear the search' }));
    await user.click(screen.getByRole('button', { name: /^Groq/ }));
    await waitFor(async () => expect(await rowNames()).toEqual(['Compound Mini']));

    await user.type(screen.getByRole('searchbox', { name: 'Search models' }), 'llama');
    expect(await screen.findByText(/No model matches “llama”/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the filters' }));
    expect(await bodyRows()).toHaveLength(7);
  });

  it('opens the details sheet from a row; Esc closes it and focus returns to the row', async () => {
    const user = userEvent.setup();
    renderPage();
    const name = within(await table()).getByRole('button', { name: 'llama-3.1-70b-instruct' });
    await user.click(name);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
      'llama-3.1-70b-instruct',
    );
    expect(within(dialog).getByText('@cf/meta/llama-3.1-70b-instruct')).toBeInTheDocument();
    expect(within(dialog).getByText('Rank 02 of 7')).toBeInTheDocument();
    expect(within(dialog).getByText('-10 on the leader')).toBeInTheDocument();
    expect(within(dialog).getByText('Past the 100-battle mark')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('shows a card list instead of the table on phones', async () => {
    wide = false;
    renderPage();
    const list = await screen.findByRole('list', { name: 'Models ranked by Elo' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(7);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Sort' })).toBeInTheDocument();
  });

  it('explains a failure and loads again on retry', async () => {
    const user = userEvent.setup();
    scenario = 'server-error';
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('The leaderboard did not load.');
    expect(screen.queryByRole('list', { name: 'Top three models' })).not.toBeInTheDocument();

    scenario = 'ok';
    await user.click(within(alert).getByRole('button', { name: /Try again/ }));
    expect(await bodyRows()).toHaveLength(7);
  });

  it('says so when no model is ranked yet', async () => {
    scenario = 'empty';
    renderPage();
    expect(await screen.findByText('No model is ranked yet.')).toBeInTheDocument();
  });

  it('keeps the board and warns when a background refresh fails', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    scenario = 'server-error';
    await user.click(screen.getByRole('button', { name: /Refresh/ }));
    const warning = await screen.findByRole('alert');
    expect(warning).toHaveTextContent('These numbers may be out of date.');
    expect(await bodyRows()).toHaveLength(7);
  });
});
