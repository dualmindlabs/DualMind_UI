import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingPage } from '@/features/marketing';
import { DEMO_BATTLES } from '@/features/marketing/content/demo';
import type * as PromptDraft from '@/lib/session/prompt-draft';
import { sendPromptToSignIn } from '@/lib/session/prompt-draft';

import { renderWithShell } from '../../render-with-shell';

// A typed prompt leaves for sign-in with a full page load; jsdom cannot navigate, so the send is
// a spy here (the storage and the redirect are covered in tests/unit/lib/session/prompt-draft).
vi.mock('@/lib/session/prompt-draft', async importOriginal => ({
  ...(await importOriginal<typeof PromptDraft>()),
  sendPromptToSignIn: vi.fn(),
}));

const fixture = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../fixtures/api/model-stats.board.recorded.json',
  ),
  'utf8',
);

/** The landing page inside the app's providers (ApiProvider included), as the root renders it. */
const renderLanding = () => renderWithShell(<LandingPage />, '/');

function stubLeaderboard(answer: 'ok' | 'fail') {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.includes('/api/arena/model-stats')) return Promise.reject(new TypeError('offline'));
    if (answer === 'fail') return Promise.reject(new TypeError('Failed to fetch'));
    return Promise.resolve(
      new Response(fixture, { status: 200, headers: { 'content-type': 'application/json' } }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const demo = () =>
  screen.getByRole('region', { name: /Recorded demo, answers written for illustration/ });

describe('LandingPage', () => {
  beforeEach(() => {
    stubLeaderboard('ok');
    vi.mocked(sendPromptToSignIn).mockClear();
  });

  it('has one h1, landmarks, a skip link and no skipped heading levels', () => {
    renderLanding();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole('heading', { level: 1, name: /Two models\. One prompt\.\s*You decide\./ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    const levels = screen.getAllByRole('heading').map(heading => Number(heading.tagName.slice(1)));
    levels.forEach((level, index) => {
      if (index > 0) expect(level - (levels[index - 1] ?? 1)).toBeLessThanOrEqual(1);
    });
  });

  it('shows live numbers and the top five from the public leaderboard', async () => {
    const fetchMock = stubLeaderboard('ok');
    renderLanding();
    const strip = screen.getByTestId('live-strip');
    await waitFor(() => expect(strip).toHaveAttribute('data-state', 'ready'));
    expect(within(strip).getByText('Llama 3.1 70B Instruct')).toBeInTheDocument();
    expect(within(strip).getByText(/Live from the public leaderboard/)).toBeInTheDocument();
    expect(screen.getByTestId('model-strip-source')).toHaveTextContent('Live · 53 models');
    const preview = screen.getByTestId('leaderboard-preview');
    expect(within(preview).getByText('#1 right now')).toBeInTheDocument();
    expect(within(preview).getAllByRole('listitem')).toHaveLength(4);
    // One request feeds the strip, the model list and the preview.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('says so, without numbers, when the leaderboard does not answer', async () => {
    stubLeaderboard('fail');
    renderLanding();
    const strip = screen.getByTestId('live-strip');
    // The query retries a network error twice, with backoff, before it gives up.
    await waitFor(() => expect(strip).toHaveAttribute('data-state', 'error'), { timeout: 4500 });
    expect(within(strip).getByText('Live numbers are unavailable right now.')).toBeInTheDocument();
    expect(within(strip).getByRole('link', { name: 'Open the leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard/',
    );
    for (const value of strip.querySelectorAll('dd')) expect(value.textContent).not.toMatch(/\d/);
    expect(screen.getByTestId('leaderboard-preview')).toHaveTextContent(
      'The live leaderboard is not answering right now.',
    );
    expect(screen.getByTestId('model-strip-source')).toHaveTextContent('List as of 20 Oct 2026');
  });

  it('plays the demo with the keyboard: vote, reveal, announce, next', async () => {
    const user = userEvent.setup();
    renderLanding();
    const region = demo();
    // The first play (instant here: jsdom has no IntersectionObserver) leaves it ready to vote.
    await waitFor(() => expect(region).toHaveAttribute('data-run', '1'));
    expect(region).toHaveAttribute('data-phase', 'voting');
    region.focus();

    await user.keyboard('2');
    expect(region).toHaveAttribute('data-phase', 'revealed');
    const announcer = screen.getByTestId('demo-announcer');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveTextContent('You voted: B is better.');
    expect(within(region).getByRole('button', { name: 'B is better' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(region).getByText('Your pick')).toBeInTheDocument();
    const next = within(region).getByRole('button', { name: 'Next prompt' });
    await waitFor(() => expect(next).toHaveFocus());

    // A second vote does nothing.
    await user.keyboard('1');
    expect(within(region).getByRole('button', { name: 'A is better' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('demo-prompt')).toHaveTextContent(DEMO_BATTLES[1]?.prompt ?? '');
    const votes = within(region).getByRole('group', { name: 'Your verdict' });
    await waitFor(() => expect(within(votes).getAllByRole('button')[0]).toHaveFocus());
    if (region.dataset.phase === 'streaming') {
      await user.click(within(region).getByRole('button', { name: 'Show all' }));
      within(votes).getAllByRole('button')[0]?.focus();
    }
    expect(region).toHaveAttribute('data-phase', 'voting');
    await user.keyboard('3');
    expect(announcer).toHaveTextContent('You voted: Tie.');
  });

  it('keeps digits typed in the composer out of the vote', async () => {
    const user = userEvent.setup();
    renderLanding();
    await waitFor(() => expect(demo()).toHaveAttribute('data-run', '1'));
    await user.type(screen.getByRole('textbox', { name: 'Ask both models' }), '1234');
    expect(demo()).toHaveAttribute('data-phase', 'voting');
  });

  it('takes a typed prompt to sign-in instead of playing the demo with it (P1-1)', async () => {
    const user = userEvent.setup();
    renderLanding();
    await waitFor(() => expect(demo()).toHaveAttribute('data-run', '1'));
    const before = demo().getAttribute('data-run');
    const status = screen.getByTestId('hero-status');
    expect(status).toHaveTextContent('Your own prompt runs on real models after a free sign-in.');
    const field = screen.getByRole('textbox', { name: 'Ask both models' });
    await user.type(field, 'Write a sonnet about tabs and spaces{Enter}');
    expect(vi.mocked(sendPromptToSignIn)).toHaveBeenCalledWith(
      'Write a sonnet about tabs and spaces',
    );
    expect(status).toHaveTextContent('Taking you to sign in. Your prompt goes with you.');
    // The demo did not restart with someone else's answer to the visitor's question.
    expect(screen.queryByTestId('asked-note')).toBeNull();
    expect(demo()).toHaveAttribute('data-run', before ?? '1');
  });

  it('plays the matching recorded battle from a chip', async () => {
    const user = userEvent.setup();
    renderLanding();
    const prompt = DEMO_BATTLES[1]?.prompt ?? '';
    await user.click(screen.getByRole('button', { name: `Play the recorded battle: ${prompt}` }));
    expect(screen.getByTestId('demo-prompt')).toHaveTextContent(prompt);
    expect(screen.queryByTestId('asked-note')).toBeNull();
    expect(vi.mocked(sendPromptToSignIn)).not.toHaveBeenCalled();
    const status = screen.getByTestId('hero-status');
    expect(status).toHaveTextContent('Playing a recorded battle below.');
    expect(
      within(status).getByRole('link', { name: 'Sign in to battle real models' }),
    ).toHaveAttribute('href', '/login/');
  });
});
