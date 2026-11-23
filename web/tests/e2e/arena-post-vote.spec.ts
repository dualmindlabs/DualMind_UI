import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, storeTheme } from './helpers';

// After the vote (backend PRs 70 and 71, both behind flags): the Truth vs Taste answer key row
// and the Cross-examine strip. Everything is hidden unless the backend response carries the data,
// so the same flow with the flags OFF must look exactly like an ordinary reveal. The API is
// answered by Playwright routes (arena-mocks.ts).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

async function vote(page: Page): Promise<Locator> {
  await page.goto('/?arena=new');
  await expect(page.getByTestId('arena')).toBeVisible();
  const prompt = page.getByRole('textbox', { name: 'Your prompt' });
  await prompt.fill('Design a cache for a read-heavy API and show the code');
  await prompt.click();
  await page.keyboard.press('Enter');
  const turn = page.getByTestId('live-turn').first();
  await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
  await turn.getByRole('button', { name: /A is better/ }).click();
  await expect(turn).toHaveAttribute('data-phase', 'revealed');
  return turn;
}

test.describe('flags off: an ordinary reveal', () => {
  test('no answer key, no cross-examine, no allowEvalItem surprises', async ({ page }) => {
    const state = await mockArena(page);
    const turn = await vote(page);
    await expect(page.getByTestId('reveal-panel')).toBeVisible();
    await expect(page.getByTestId('answer-key')).toHaveCount(0);
    await expect(page.getByTestId('cross-examine')).toHaveCount(0);
    await expect(turn.getByTestId('eval-question-note')).toHaveCount(0);
    // The one probe for cross-examine went out and was answered 404; nothing else.
    expect(state.requests.filter(line => line.includes('critique'))).toEqual([]);
    // The battle opts in to Truth vs Taste; the API ignores it while its flag is off.
    const battle = state.bodies.find(item => item.path === '/api/arena/dualchat');
    expect(battle?.body.allowEvalItem).toBe(true);
  });
});

test.describe('Truth vs Taste', () => {
  test('after the vote, the answer key shows the expected answer and each side', async ({
    page,
  }) => {
    await mockArena(page, { truth: true });
    const turn = await vote(page);
    // The question the API asked replaced the typed one, and the page says so.
    await expect(turn.getByTestId('eval-question-note')).toBeVisible();
    // The prompt card shows it twice (collapsed line and full text); either proves it is the question asked.
    await expect(turn.getByText('What is 17 x 23? Give just the number.').last()).toBeAttached();
    const key = page.getByTestId('answer-key');
    await expect(key).toBeVisible();
    await expect(page.getByTestId('answer-key-answer')).toHaveText('391');
    await expect(page.getByTestId('answer-key-side-a')).toContainText('matched the key');
    await expect(page.getByTestId('answer-key-side-b')).toContainText('did not match the key');
    await expect(key).toContainText('Model names stay hidden');
    expect(await key.innerText()).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  test('the key is never on screen before the vote', async ({ page }) => {
    await mockArena(page, { truth: true });
    await page.goto('/?arena=new');
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });
    await prompt.fill('anything');
    await prompt.click();
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
    await expect(page.getByTestId('answer-key')).toHaveCount(0);
    await expect(page.getByTestId('answer-key-answer')).toHaveCount(0);
  });

  test('a placeholder item is labeled as a sample', async ({ page }) => {
    await mockArena(page, { truth: { sample: true } });
    await vote(page);
    await expect(page.getByTestId('answer-key')).toContainText('Sample question');
  });
});

test.describe('Cross-examine', () => {
  test('critique, a rebuttal under each answer, then an optional second vote', async ({ page }) => {
    const state = await mockArena(page, { crossExamine: true });
    const turn = await vote(page);
    const strip = page.getByTestId('cross-examine');
    await expect(strip).toBeVisible();
    await expect(strip).toContainText('Your first vote has already counted');
    await strip.getByRole('button', { name: 'Ask for the critique' }).click();

    const rebuttals = turn.getByTestId('rebuttal');
    await expect(rebuttals).toHaveCount(2);
    // Under answer A: the reply written by B (slot 2). Under answer B: the one written by A.
    const underA = turn.getByRole('region', { name: /^Answer A/ }).getByTestId('rebuttal');
    const underB = turn.getByRole('region', { name: /^Answer B/ }).getByTestId('rebuttal');
    await expect(underA).toContainText('never shows the steps');
    await expect(underB).toContainText('skipped the carry');

    const group = page.getByRole('group', { name: 'Vote again, optional' });
    await expect(group).toBeVisible();
    await group.getByRole('button', { name: 'B is better' }).click();
    await expect(page.getByTestId('cross-examine-outcome')).toContainText(
      'You changed your vote to "B is better".',
    );
    const second = state.bodies.find(item => item.path === '/api/arena/model-vote/round2');
    expect(second?.body).toMatchObject({ voteChoice: 'right' });
    // The first vote is the one that was sent to the board's route, once.
    expect(state.bodies.filter(item => item.path === '/api/arena/model-vote')).toHaveLength(1);
  });

  test('keeping the first vote says so', async ({ page }) => {
    await mockArena(page, { crossExamine: true });
    await vote(page);
    await page.getByRole('button', { name: 'Ask for the critique' }).click();
    await page
      .getByRole('group', { name: 'Vote again, optional' })
      .getByRole('button', { name: 'A is better' })
      .click();
    await expect(page.getByTestId('cross-examine-outcome')).toContainText('You kept your vote');
  });

  test('a failed critique says why, keeps the vote, and can be retried', async ({ page }) => {
    await mockArena(page, {
      crossExamine: { fail: { call: 'critique', status: 503, code: 'CRITIQUE_UNAVAILABLE' } },
    });
    const turn = await vote(page);
    await page.getByRole('button', { name: 'Ask for the critique' }).click();
    await expect(page.getByTestId('critique-error')).toContainText('could not write a critique');
    await expect(page.getByRole('button', { name: 'Try the critique again' })).toBeVisible();
    await expect(turn.getByTestId('rebuttal')).toHaveCount(0);
    await expect(page.getByTestId('verdict')).toBeVisible();
  });

  test('a failed second vote says why and can be retried', async ({ page }) => {
    await mockArena(page, {
      crossExamine: { fail: { call: 'round2', status: 409, code: 'ALREADY_VOTED_ROUND2' } },
    });
    await vote(page);
    await page.getByRole('button', { name: 'Ask for the critique' }).click();
    const group = page.getByRole('group', { name: 'Vote again, optional' });
    await group.getByRole('button', { name: 'Tie' }).click();
    await expect(page.getByTestId('second-vote-error')).toContainText('already cast a second vote');
    await expect(group.getByRole('button', { name: 'Tie' })).toBeEnabled();
  });

  test('the panes keep their size when the rebuttals land (no layout shift in the vote area)', async ({
    page,
  }) => {
    await mockArena(page, { crossExamine: { critiqueDelayMs: 600 } });
    await vote(page);
    await page.getByRole('button', { name: 'Ask for the critique' }).click();
    await expect(page.getByTestId('rebuttal-pending')).toHaveCount(2);
    await expect(page.getByTestId('rebuttal')).toHaveCount(2);
    await expect(page.getByTestId('rebuttal-pending')).toHaveCount(0);
  });

  test('works from the keyboard', async ({ page }) => {
    await mockArena(page, { crossExamine: true });
    await vote(page);
    const ask = page.getByRole('button', { name: 'Ask for the critique' });
    await ask.focus();
    await page.keyboard.press('Enter');
    const group = page.getByRole('group', { name: 'Vote again, optional' });
    await expect(group).toBeVisible();
    await group.getByRole('button', { name: 'Tie' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByTestId('cross-examine-outcome')).toContainText('changed your vote');
  });
});

for (const theme of ['dark', 'light'] as const) {
  test(`axe: key row, strip and rebuttals have no violations, ${theme}`, async ({ page }) => {
    await storeTheme(page, theme);
    await mockArena(page, { truth: true, crossExamine: true });
    await vote(page);
    await page.getByRole('button', { name: 'Ask for the critique' }).click();
    await expect(page.getByTestId('rebuttal')).toHaveCount(2);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`),
    ).toEqual([]);
  });
}

test('phone: no sideways scroll with the key row, the strip and the rebuttals', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockArena(page, { truth: true, crossExamine: true });
  await vote(page);
  await page.getByRole('button', { name: 'Ask for the critique' }).click();
  await expect(page.getByTestId('rebuttal')).toHaveCount(2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
