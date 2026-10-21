import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// Slice S8: the signed-in arena shell at / (opt-in with ?arena=new while the battle flow is
// built): the switch from the landing page, the history (groups, search, rename, delete), the
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

async function openArena(page: Page, path = '/?arena=new') {
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

test.describe('the switch at /', () => {
  test('?arena=new opts a signed-in visitor in, remembers it and cleans the address', async ({
    page,
  }) => {
    const problems = collectProblems(page);
    const csp = await cspViolations(page);
    await mockArena(page);
    await openArena(page);
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => window.localStorage.getItem('dm.arena'))).toBe('new');
    await expect(
      page.getByRole('heading', { level: 1, name: /Two minds\.\s*Your verdict\./ }),
    ).toBeVisible();
    await expect(page.locator('[data-landing]')).toHaveCount(0);
    await expect(page).toHaveTitle('Arena · DualMind Arena');
    // A reload keeps the arena without the parameter.
    await page.reload();
    await expect(page.getByTestId('arena')).toBeVisible();
    expect(problems).toEqual([]);
    expect(csp).toEqual([]);
  });

  test('a signed-in visitor who has not opted in still goes to the legacy arena', async ({
    page,
  }) => {
    await page.route(/\/(config\.js|js\/.*)$/, route => route.abort());
    await mockArena(page);
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForURL(/\/legacy-app/);
  });

  test('?arena=legacy opts out again', async ({ page }) => {
    await page.route(/\/(config\.js|js\/.*)$/, route => route.abort());
    await mockArena(page);
    await openArena(page);
    await page.goto('/?arena=legacy', { waitUntil: 'commit' });
    await page.waitForURL(/\/legacy-app/);
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
    await openArena(page, '/?arena=new&thread=t-recursion');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Explain recursion to a ten-year-old' }),
    ).toBeVisible();
    const turns = page.getByTestId('turn');
    await expect(turns).toHaveCount(2);
    const first = turns.nth(0);
    await expect(first.getByRole('region', { name: /Answer A/ })).toBeVisible();
    await expect(first.getByRole('region', { name: /Answer B/ })).toContainText('nesting dolls');
    await expect(first).toContainText('Your verdict: B is better');
    await expect(first.getByTestId('pane-model').first()).toHaveText(/llama-3\.3-70b/);
    await expect(turns.nth(1)).toContainText('both names stay hidden');
    await expect(turns.nth(1).getByTestId('pane-model')).toHaveCount(0);
    // Safe links: https only, new tab, host shown.
    const link = first.getByRole('link', { name: /Python docs/ });
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    await expect(link).toContainText('docs.python.org');
    // The history marks the open thread.
    await expect(page.getByRole('link', { name: /Explain recursion/ }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(page).toHaveTitle('Explain recursion to a ten-year-old · DualMind Arena');
    expect(problems).toEqual([]);
  });

  test('opening threads from the history and N for a new battle', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    await page.getByRole('link', { name: /Write a haiku about merge conflicts/ }).click();
    await expect(page).toHaveURL(/\?thread=t-haiku/);
    await expect(page.getByText('Side by side', { exact: false }).first()).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 300 } });
    await page.keyboard.press('n');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('textbox', { name: 'Your prompt' })).toBeFocused();
  });

  test('a missing thread says so and offers a new battle', async ({ page }) => {
    await mockArena(page);
    await openArena(page, '/?arena=new&thread=nope');
    await expect(page.getByRole('heading', { name: 'This thread is not here' })).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: 'Start a new battle' }).click();
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
      for (const path of ['/?arena=new', '/?thread=t-recursion']) {
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
    await page.getByTestId('turn').first().getByRole('button', { name: 'Answer B' }).click();
    await expect(
      page.getByTestId('turn').first().getByRole('button', { name: 'Answer B' }),
    ).toHaveAttribute('aria-pressed', 'true');
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
          await page.keyboard.press('[');
          await settle(page, 500);
          await page.screenshot({ path: shotPath(`arena-thread-rail-${theme}`) });
          await page.keyboard.press('[');
          await openArena(page, '/?arena=new');
          await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
          await page.getByRole('button', { name: /Model for answer A/ }).click();
          await settle(page, 400);
          await page.screenshot({ path: shotPath(`arena-model-picker-${theme}`) });
          await page.keyboard.press('Escape');
          await page.getByRole('radio', { name: 'Battle' }).check({ force: true });
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
