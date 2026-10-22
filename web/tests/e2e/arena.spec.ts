import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// Slices S8 and S9: the signed-in arena at / (the only arena since the cutover; a leftover ?arena=legacy changes nothing): the switch from the landing page, the history (groups, search, rename, delete), the
// composer (modes, model pickers, starters), /?thread= deep links, keyboard, axe, overflow and
// the review screenshots. Supabase and the API are answered by Playwright routes (arena-mocks.ts).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  return problems;
}

async function cspViolations(page: Page) {
  const violations: string[] = [];
  await page.exposeFunction('reportArenaCsp', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      (window as unknown as { reportArenaCsp: (text: string) => void }).reportArenaCsp(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  return violations;
}

async function openArena(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByTestId('arena')).toBeVisible();
}

/** Page-level horizontal overflow: scroll containers (the phone pane row) clip their content. */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const clipped = (element: Element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) return false;
        const { overflowX } = getComputedStyle(parent);
        if (['hidden', 'clip', 'auto', 'scroll'].includes(overflowX)) return true;
      }
      return false;
    };
    const offenders = [...document.querySelectorAll('body *')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > limit && !clipped(element);
      })
      .slice(0, 5)
      .map(
        element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
      );
    if (document.documentElement.scrollWidth > limit) offenders.push('documentElement');
    return offenders;
  });
}

test.describe('the arena at /', () => {
  test('a signed-in visitor gets the arena at /, and a reload keeps it', async ({ page }) => {
    const problems = collectProblems(page);
    const csp = await cspViolations(page);
    await mockArena(page);
    await openArena(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Two models\. One prompt\.\s*You decide\./ }),
    ).toBeVisible();
    await expect(page.locator('[data-landing]')).toHaveCount(0);
    await expect(page).toHaveTitle('Arena · DualMind Arena');
    await page.reload();
    await expect(page.getByTestId('arena')).toBeVisible();
    expect(problems).toEqual([]);
    expect(csp).toEqual([]);
  });

  test('the account menu has no way back to a classic arena', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    await page.getByRole('button', { name: /^Account/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /classic arena/i })).toHaveCount(0);
  });

  test('a leftover ?arena=legacy or dm.arena=legacy still opens the arena', async ({ page }) => {
    await mockArena(page);
    await page.addInitScript(() => window.localStorage.setItem('dm.arena', 'legacy'));
    await openArena(page, '/?arena=legacy');
    await expect(page.getByTestId('arena')).toBeVisible();
    // The arena drops the old parameter from the address.
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('history', () => {
  test('groups threads by day, searches, renames and deletes', async ({ page }) => {
    const state = await mockArena(page);
    await openArena(page);
    const history = page.getByRole('navigation', { name: 'Your threads' });
    for (const group of ['Today', 'Yesterday', 'Last 7 days', 'Older']) {
      await expect(history.getByRole('heading', { name: group })).toBeVisible();
    }
    await expect(history.getByRole('link')).toHaveCount(6);

    await page.getByRole('searchbox', { name: 'Search your threads' }).fill('monty');
    await expect(history.getByRole('link')).toHaveCount(1);
    await page.getByRole('searchbox', { name: 'Search your threads' }).fill('nothing here');
    await expect(history).toContainText('No thread matches');
    await page.getByRole('searchbox', { name: 'Search your threads' }).fill('');

    await history.getByRole('button', { name: 'Actions for Review this SQL for bugs' }).click();
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const title = page.getByRole('textbox', { name: 'Title' });
    await title.fill('SQL review, grouped by customer');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Thread renamed')).toBeVisible();
    await expect(
      history.getByRole('link', { name: /SQL review, grouped by customer/ }),
    ).toBeVisible();

    await history
      .getByRole('button', { name: 'Actions for Plan three days in Lisbon on a budget' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Thread deleted')).toBeVisible();
    await expect(history.getByRole('link')).toHaveCount(5);
    expect(state.requests).toContain('DELETE /api/threads/t-lisbon');
  });

  test('an empty history and a failed one have their own states', async ({ page }) => {
    await mockArena(page, { threads: [] });
    await openArena(page);
    await expect(page.getByText('No threads yet.')).toBeVisible();
  });

  test('a failed history offers a retry', async ({ page }) => {
    await mockArena(page, { failThreads: true });
    await openArena(page);
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('threads', () => {
  test('/?thread= opens a thread: prompts, both answers, the verdict, hidden names', async ({
    page,
  }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page, '/?thread=t-recursion');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Explain recursion to a ten-year-old' }),
    ).toBeVisible();
    const turns = page.getByTestId('turn');
    await expect(turns).toHaveCount(2);
    const first = turns.nth(0);
    await expect(first.getByRole('region', { name: /Answer A/ })).toBeVisible();
    await expect(first.getByRole('region', { name: /Answer B/ })).toContainText('nesting dolls');
    await expect(first).toContainText('Your verdict: B is better');
    await expect(first.getByTestId('pane-model').first()).toHaveText(/Llama 3\.3 70B/);
    await expect(turns.nth(1)).toContainText('both names stay hidden');
    await expect(turns.nth(1).getByTestId('pane-model')).toHaveCount(0);
    await expect(turns.nth(1).getByTestId('pane-meta')).toHaveCount(0);
    // Safe links: https only, new tab, host shown.
    const link = first.getByRole('link', { name: /Python docs/ });
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    await expect(link).toContainText('docs.python.org');
    // The history is a slide-over on the battle stage, and it marks the open thread.
    await page.getByRole('button', { name: 'Open the history' }).click();
    await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Explain recursion/ }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'History' })).toBeHidden();
    await expect(page).toHaveTitle('Explain recursion to a ten-year-old · DualMind Arena');
    expect(problems).toEqual([]);
  });

  test('opening threads from the history and N for a new battle', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    await page.getByRole('link', { name: /Write a haiku about merge conflicts/ }).click();
    await expect(page).toHaveURL(/\?thread=t-haiku/);
    await expect(page.getByText('Side by side', { exact: false }).first()).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('n');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('textbox', { name: 'Your prompt' })).toBeFocused();
  });

  test('a missing thread says so and offers a new battle', async ({ page }) => {
    await mockArena(page);
    await openArena(page, '/?thread=nope');
    await expect(page.getByRole('heading', { name: 'This thread is not here' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Start a new battle' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('thread of another account', () => {
  test('a stale link says it belongs to another account and offers a New battle', async ({
    page,
  }) => {
    await mockArena(page, { foreignThreads: ['t-theirs'] });
    await openArena(page, '/?thread=t-theirs');
    const heading = page.getByRole('heading', {
      name: 'This conversation belongs to another account',
    });
    await expect(heading).toBeVisible({ timeout: 20_000 });
    // The header has a New battle button too: take the one inside the panel.
    await heading.locator('xpath=..').getByRole('button', { name: 'New battle' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('composer', () => {
  test('modes, model pickers in the legacy keys, starters and the palette', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });

    await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
    await expect(page.getByRole('heading', { level: 1, name: /Pick two\./ })).toBeVisible();
    await page.getByRole('button', { name: /Model for answer A/ }).click();
    await page.getByRole('option', { name: /Compound Mini/ }).click();
    expect(await page.evaluate(() => window.localStorage.getItem('battle.model.left'))).toBe(
      'groq/compound-mini',
    );
    await expect(
      page.getByRole('button', { name: /Model for answer A: Compound Mini/ }),
    ).toBeVisible();

    await page.getByRole('radio', { name: 'Direct' }).check({ force: true });
    await expect(page.getByRole('button', { name: /^Model: random/ })).toBeVisible();
    await page.getByRole('radio', { name: 'Battle' }).check({ force: true });

    await page.getByRole('button', { name: 'Reasoning' }).click();
    await page.getByRole('button', { name: /Which is bigger, 9\.11 or 9\.9/ }).click();
    await expect(prompt).toHaveValue(/Which is bigger/);
    await expect(prompt).toBeFocused();
    await expect(page.getByRole('button', { name: 'Send' })).toBeEnabled();

    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.getByRole('combobox').fill('switch to direct');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('radio', { name: 'Direct' })).toBeChecked();
  });
});

test.describe('quality', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`axe: no serious or critical violations, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await mockArena(page);
      for (const path of ['/', '/?thread=t-recursion']) {
        await openArena(page, path);
        await settle(page, 600);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze();
        const blocking = results.violations
          .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
          .map(
            violation =>
              `${violation.id}: ${violation.nodes
                .map(node => node.target.join(' '))
                .slice(0, 3)
                .join(', ')}`,
          );
        expect(blocking, path).toEqual([]);
      }
    });
  }

  test('no horizontal overflow at 360 px, and the history drawer on phones', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await mockArena(page);
    await openArena(page);
    expect(await overflowing(page)).toEqual([]);
    await openArena(page, '/?thread=t-recursion');
    await expect(page.getByTestId('turn').first()).toBeVisible();
    expect(await overflowing(page)).toEqual([]);
    // The phone switch shows answer B.
    const answerB = page
      .getByTestId('turn')
      .first()
      .getByRole('button', { name: 'Answer B', exact: true });
    await answerB.click();
    await expect(answerB).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Open the history' }).click();
    await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
  });
});

test.describe('screenshots', () => {
  const viewports = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
  ] as const;
  for (const viewport of viewports) {
    for (const theme of ['dark', 'light'] as const) {
      test(`arena: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page);
        await openArena(page);
        await settle(page, 900);
        await page.screenshot({ path: shotPath(`arena-empty-${viewport.label}-${theme}`) });

        await openArena(page, '/?thread=t-recursion');
        await expect(page.getByTestId('turn').first()).toBeVisible();
        await settle(page, 700);
        await page.screenshot({ path: shotPath(`arena-thread-${viewport.label}-${theme}`) });

        if (viewport.label === 'desktop') {
          // On the battle stage `[` opens the history as a slide-over.
          await page.keyboard.press('[');
          await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
          await settle(page, 500);
          await page.screenshot({ path: shotPath(`arena-thread-history-${theme}`) });
          await page.keyboard.press('Escape');
          // The model picker's screenshots are in arena-polish.spec.ts.
        } else {
          await page.getByRole('button', { name: 'Open the history' }).click();
          await settle(page, 600);
          await page.screenshot({ path: shotPath(`arena-history-drawer-${theme}`) });
        }
      });
    }
  }

  test('arena: empty history and empty state, desktop', async ({ page }) => {
    await mockArena(page, { threads: [] });
    await openArena(page);
    await settle(page, 700);
    await page.screenshot({ path: shotPath('arena-empty-history-dark') });
  });
});

test.describe('battles', () => {
  test('prompt, both answers, vote with the keyboard, reveal, follow-up, new battle', async ({
    page,
  }) => {
    const problems = collectProblems(page);
    const state = await mockArena(page);
    await openArena(page);
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });
    await prompt.fill('Explain recursion to a ten-year-old');
    await page.keyboard.press('Control+Enter');

    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    await expect(page).toHaveURL(/\?thread=t-new-/);
    await expect(turn.getByRole('region', { name: /Answer A/ })).toContainText('base case');
    await expect(turn.getByRole('region', { name: /Answer B/ })).toContainText('nesting dolls');
    // Blind: no names, no timing, length or tokens before the vote (they hint at the model).
    await expect(turn.getByTestId('pane-model')).toHaveCount(0);
    await expect(turn.getByTestId('pane-meta')).toHaveCount(0);
    await expect(turn).not.toContainText('Tokens');
    await expect(turn).not.toContainText(/\d words/);
    await expect(page.getByTestId('arena-announcer')).toContainText('Both answers are ready');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('2');
    await expect(turn).toHaveAttribute('data-phase', 'revealed');
    await expect(turn.getByTestId('verdict')).toContainText('B is better');
    await expect(page.getByTestId('arena-announcer')).toContainText(
      'You voted B. Model A was Llama 3.3 70B Instruct (FP8, fast). Model B was Compound Mini.',
    );
    await expect(turn.getByTestId('pane-model').nth(1)).toContainText('Compound Mini', {
      timeout: 5000,
    });
    await expect(turn.getByRole('region', { name: /Answer B/ })).toContainText('Tokens');
    await expect(turn.getByTestId('pane-meta')).toHaveCount(2);
    const vote = state.bodies.find(item => item.path === '/api/arena/model-vote');
    expect(vote?.body).toMatchObject({ comparisonId: 'c-live-1', voteChoice: 'right' });

    // A follow-up keeps the pair and the thread.
    await prompt.fill('Now with a Python example');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('live-turn')).toHaveCount(2);
    const battles = state.bodies.filter(item => item.path === '/api/arena/dualchat');
    expect(battles[1]?.body.threadId).toBe(battles[0]?.body.threadId);
    expect(typeof battles[1]?.body.model1).toBe('string');
    expect(typeof battles[1]?.body.model2).toBe('string');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('n');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('live-turn')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('an offline vote is queued, shown as pending, then sent on reconnect', async ({
    page,
    context,
  }) => {
    const state = await mockArena(page);
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Which is bigger, 9.11 or 9.9?');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    await context.setOffline(true);
    // The vote pill opens once both answers are read, or on "Vote now".
    await turn.getByRole('button', { name: 'Vote now' }).click({ timeout: 1500 }).catch(() => undefined);
    await turn.getByRole('button', { name: /A is better/ }).click();
    await expect(turn.getByTestId('vote-pending')).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem('dm.voteQueue.v1'))).toContain(
      'c-live-1',
    );
    await context.setOffline(false);
    await expect(turn.getByTestId('vote-pending')).toHaveCount(0, { timeout: 15_000 });
    expect(state.bodies.some(item => item.path === '/api/arena/model-vote')).toBe(true);
  });

  test('Side by side sends the picked pair and shows names at once', async ({ page }) => {
    const state = await mockArena(page);
    await openArena(page);
    await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
    await page.getByRole('button', { name: /Model for answer B/ }).click();
    await page.getByRole('option', { name: /Gemma 3n E2B IT/ }).click();
    await page
      .getByRole('textbox', { name: 'Your prompt' })
      .fill('Write a haiku about merge conflicts');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    await expect(turn.getByTestId('pane-model').nth(1)).toContainText('Gemma 3n E2B IT');
    await expect(turn.getByText('Voting is optional here.')).toBeVisible();
    const body = state.bodies.find(item => item.path === '/api/arena/dualchat')?.body;
    expect(body?.model2).toBe('1fe310c7-24d1-49a5-a042-2e409e009524');
    expect(typeof body?.model1).toBe('string');
  });

  test('Direct streams the answer from the server in chunks', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    await page.getByRole('radio', { name: 'Direct' }).check({ force: true });
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Say hello');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
    await expect(turn).toHaveAttribute('data-phase', 'done', { timeout: 15_000 });
    await expect(turn).toContainText('one word at a time');
    await expect(turn.locator('strong')).toHaveText('one word at a time');
  });
});

test.describe('battles with the new API behaviour', () => {
  test('sends one Idempotency-Key per battle attempt', async ({ page }) => {
    const state = await mockArena(page);
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Explain recursion');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('live-turn').first()).toHaveAttribute(
      'data-phase',
      'awaiting_vote',
      { timeout: 15_000 },
    );
    expect(state.idempotencyKeys).toHaveLength(1);
    expect(state.idempotencyKeys[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  test('a battle a backup model answered is not rated: no vote, one calm line, no names', async ({
    page,
  }) => {
    const problems = collectProblems(page);
    await mockArena(page, { battle: 'fallback' });
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Explain recursion');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'done', { timeout: 15_000 });
    await expect(turn.getByTestId('unrated-note')).toHaveText(
      'One model was unavailable, so a backup answered. This battle is not rated.',
    );
    await expect(turn.getByTestId('vote-bar')).toHaveCount(0);
    await expect(turn.getByTestId('pane-model')).toHaveCount(0);
    await expect(turn).not.toContainText(/compound|llama/i);
    await expect(page.getByTestId('arena-announcer')).toContainText('This battle is not rated');
    expect(problems).toEqual([]);
  });
});

test.describe('fallback battle screenshots', () => {
  for (const viewport of [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'phone', width: 390, height: 844 },
  ] as const) {
    for (const theme of ['dark', 'light'] as const) {
      test(`arena-fallback: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page, { battle: 'fallback' });
        await openArena(page);
        await page.getByRole('textbox', { name: 'Your prompt' }).fill('Explain recursion');
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'done', { timeout: 15_000 });
        await turn.getByTestId('unrated-note').scrollIntoViewIfNeeded();
        await settle(page, 400);
        await page.screenshot({ path: shotPath(`arena-fallback-${viewport.label}-${theme}`) });
      });
    }
  }
});

test.describe('battle screenshots', () => {
  for (const viewport of [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
  ] as const) {
    for (const theme of ['dark', 'light'] as const) {
      test(`battle: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page, { battleDelayMs: 2500 });
        await openArena(page);
        await page
          .getByRole('textbox', { name: 'Your prompt' })
          .fill('Explain recursion to a ten-year-old');
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await page.waitForTimeout(900);
        await page.screenshot({ path: shotPath(`battle-waiting-${viewport.label}-${theme}`) });
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
        await settle(page, 400);
        await page.screenshot({ path: shotPath(`battle-vote-${viewport.label}-${theme}`) });
        // The vote pill opens once both answers are read, or on "Vote now".
        await turn.getByRole('button', { name: 'Vote now' }).click({ timeout: 1500 }).catch(() => undefined);
        await turn.getByRole('button', { name: /B is better/ }).click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await page.waitForTimeout(500);
        await page.screenshot({ path: shotPath(`battle-reveal-${viewport.label}-${theme}`) });
        await settle(page, 2600);
        await page.screenshot({ path: shotPath(`battle-revealed-${viewport.label}-${theme}`) });
      });
    }
  }

  test('battle: reduced motion shows everything at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockArena(page);
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Explain recursion');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    // The vote pill opens once both answers are read, or on "Vote now".
    await turn.getByRole('button', { name: 'Vote now' }).click({ timeout: 1500 }).catch(() => undefined);
    await turn.getByRole('button', { name: /A is better/ }).click();
    await expect(turn.getByTestId('pane-model').first()).toContainText(
      'Llama 3.3 70B Instruct (FP8, fast)',
    );
    await settle(page, 300);
    await page.screenshot({ path: shotPath('battle-revealed-reduced-motion') });
  });

  test('direct: streaming answer, desktop', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    await page.getByRole('radio', { name: 'Direct' }).check({ force: true });
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Say hello');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('live-turn').first()).toHaveAttribute('data-phase', 'done', {
      timeout: 15_000,
    });
    await settle(page, 300);
    await page.screenshot({ path: shotPath('direct-answer-dark') });
  });
});
