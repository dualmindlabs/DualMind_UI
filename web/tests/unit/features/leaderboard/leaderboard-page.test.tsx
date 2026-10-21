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

  it('loads the board without a sign-in: human names, rated models ranked, the rest apart', async () => {
    renderPage();
    // Four of the seven models have 100 battles or more; the other three have no rank yet.
    expect(await rowNames()).toEqual([
      'Llama 3.1 70B Instruct',
      'Compound Mini',
      'Hermes 2 Pro Mistral 7B',
      'Llama 3.2 11B Vision Instruct',
    ]);
    const podium = screen.getByRole('list', { name: 'Top three models' });
    expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
    // The 96-battle model that tops the API's own ranking is not on the podium.
    expect(within(podium).queryByText(/FP8/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Not yet rated' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 3 models' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByText(/Demo data/)).toBeInTheDocument();
  });

  it('keeps the unrated models collapsed, without rank numbers, until asked', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    expect(screen.getAllByRole('table')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Show 3 models' }));
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    const unrated = tables[1] as HTMLElement;
    expect(within(unrated).queryByRole('button', { name: 'Rank' })).not.toBeInTheDocument();
    const names = within(unrated)
      .getAllByRole('row')
      .slice(1)
      .map(row => within(row).getByRole('rowheader').querySelector('button')?.textContent);
    expect(names).toEqual(['Llama 3.3 70B Instruct (FP8, fast)', 'Gemma 3n E2B IT', 'Gemma 3 1B IT']);
    expect(screen.getByRole('button', { name: 'Hide 3 models' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
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
    expect((await rowNames())[0]).toBe('Llama 3.1 70B Instruct');

    await user.click(battles);
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect((await rowNames())[0]).toBe('Compound Mini');
  });

  it('searches and filters by provider, and reports the count', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await user.type(screen.getByRole('searchbox', { name: 'Search models' }), 'gemma');
    // Both Gemma models are not yet rated: a search opens that group so the match is visible.
    await waitFor(async () => expect(await bodyRows()).toHaveLength(2));
    expect(screen.getByText(/No rated model matches/)).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 2 of 7 models');

    await user.click(screen.getByRole('button', { name: 'Clear the search' }));
    await user.click(screen.getByRole('button', { name: /^Groq/ }));
    await waitFor(async () => expect(await rowNames()).toEqual(['Compound Mini']));

    await user.type(screen.getByRole('searchbox', { name: 'Search models' }), 'llama');
    expect(await screen.findByText(/No model matches “llama”/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear the filters' }));
    expect(await bodyRows()).toHaveLength(4);
  });

  it('opens the details sheet from a row; Esc closes it and focus returns to the row', async () => {
    const user = userEvent.setup();
    renderPage();
    const name = within(await table()).getByRole('button', { name: 'Compound Mini' });
    await user.click(name);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Compound Mini');
    // The raw id stays in the details, in mono text under the name.
    expect(within(dialog).getByText('groq/compound-mini')).toBeInTheDocument();
    expect(within(dialog).getByText('Rank 02 of 4')).toBeInTheDocument();
    expect(within(dialog).getByText('-89 on the leader')).toBeInTheDocument();
    expect(within(dialog).getByText('Past the 100-battle mark')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('shows a card list instead of the table on phones', async () => {
    wide = false;
    renderPage();
    const list = await screen.findByRole('list', { name: 'Models ranked by Elo' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
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
    expect(await bodyRows()).toHaveLength(4);
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
    expect(await bodyRows()).toHaveLength(4);
  });
});
