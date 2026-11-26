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

/** Turns on the switch that adds the models a visitor cannot meet in a blind battle. */
async function showEverything(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole('switch', {
      name: /Also show models you cannot meet in a blind battle/,
    }),
  );
}

beforeEach(() => {
  // The switch keeps its state in the address (?show=all): start every test from a clean one.
  window.history.replaceState(null, '', '/');
  scenario = 'ok';
  wide = true;
  installMatchMedia();
});

describe('LeaderboardPage', () => {
  it('shows the prerendered parts at once: one h1, the methodology, a loading state', () => {
    renderPage();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Every model, on one public board.',
    );
    expect(screen.getByRole('heading', { name: /How to read the board/ })).toBeInTheDocument();
    expect(screen.getByText('Loading the leaderboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /How ratings work/ })).toHaveAttribute(
      'href',
      '/how-it-works/#rating',
    );
  });

  it('shows only the models a visitor can meet in a blind battle by default, and says what is left out', async () => {
    renderPage();
    // Of the seven models, two Cloudflare ones are pick-only and three are retired (Compound Mini
    // and two Cloudflare models that left Cloudflare's catalogue).
    expect(await rowNames()).toEqual(['Gemma 3n E2B IT', 'Gemma 3 1B IT']);
    const toggle = screen.getByRole('switch', {
      name: /Also show models you cannot meet in a blind battle/,
    });
    expect(toggle).not.toBeChecked();
    expect(screen.getByTestId('scope-switch')).toHaveTextContent(
      /5 models are left out by default/,
    );
    expect(screen.queryByText('Retired')).not.toBeInTheDocument();
    expect(screen.queryByText('Pick-only')).not.toBeInTheDocument();
  });

  it('keeps the switch in the address, so a link to the wider board works', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await showEverything(user);
    expect(window.location.search).toBe('?show=all');
    await user.click(screen.getByRole('switch', { name: /Also show models you cannot meet/ }));
    expect(window.location.search).toBe('');
  });

  it('opens with every model when the address says ?show=all', async () => {
    window.history.replaceState(null, '', '/leaderboard/?show=all');
    renderPage();
    expect(await bodyRows()).toHaveLength(7);
    expect(screen.getByRole('switch', { name: /Also show models you cannot meet/ })).toBeChecked();
  });

  it('labels each model that is not in blind battles once the switch is on', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await showEverything(user);
    const rows = await bodyRows();
    expect(rows).toHaveLength(7);
    const labelOf = (name: string) =>
      rows.find(row => within(row).queryByRole('button', { name }))?.textContent ?? '';
    expect(labelOf('Compound Mini')).toContain('Retired');
    expect(labelOf('Llama 3.3 70B Instruct (FP8, fast)')).toContain('Pick-only');
    expect(labelOf('Gemma 3n E2B IT')).not.toMatch(/Retired|Pick-only/);
    // Back to the default: the others go again.
    await user.click(screen.getByRole('switch', { name: /Also show models you cannot meet/ }));
    expect(await bodyRows()).toHaveLength(2);
  });

  it('loads the board without a sign-in: human names, rated models ranked, the rest apart', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await showEverything(user);
    // All seven models have 5 battles or more, so every one is ranked.
    expect(await rowNames()).toEqual([
      'Llama 3.3 70B Instruct (FP8, fast)',
      'Llama 3.1 70B Instruct',
      'Compound Mini',
      'Gemma 3n E2B IT',
      'Hermes 2 Pro Mistral 7B',
      'Llama 3.2 11B Vision Instruct',
      'Gemma 3 1B IT',
    ]);
    const podium = screen.getByRole('list', { name: 'Top three models' });
    expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
    // The model that tops the API's own ranking (96 battles) is on the podium.
    expect(within(podium).getByText(/FP8/)).toBeInTheDocument();
    // Nobody is below the threshold here, so there is no "Not yet rated" group.
    expect(screen.queryByRole('heading', { name: 'Not yet rated' })).not.toBeInTheDocument();
    expect(screen.getByText(/Demo data/)).toBeInTheDocument();
  });

  it('sorts when a column header is pressed, and says so with aria-sort', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await showEverything(user);
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
    expect((await rowNames())[0]).toBe('Gemma 3n E2B IT');
  });

  it('searches and filters by provider, and reports the count', async () => {
    const user = userEvent.setup();
    renderPage();
    await table();
    await showEverything(user);
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
    await table();
    await showEverything(user);
    const name = within(await table()).getByRole('button', { name: 'Compound Mini' });
    await user.click(name);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent('Compound Mini');
    // The raw id stays in the details, in mono text under the name.
    expect(within(dialog).getByText('groq/compound-mini')).toBeInTheDocument();
    expect(within(dialog).getByText('Rank 03 of 7')).toBeInTheDocument();
    expect(within(dialog).getByText('-99 on the leader')).toBeInTheDocument();
    expect(within(dialog).getByText('Past the 5-battle mark')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('shows a card list instead of the table on phones', async () => {
    wide = false;
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('list', { name: 'Models ranked by Elo' });
    await showEverything(user);
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
    expect(await bodyRows()).toHaveLength(2);
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
    expect(await bodyRows()).toHaveLength(2);
  });
});
