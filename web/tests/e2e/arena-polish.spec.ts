import { expect, type Locator, type Page, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// Arena polish (UI audit fix PR 5): the model picker (P1-11), syntax highlighting in answers,
// the keyboard shortcuts overlay, the phone starter rows and history rows (P2-9), and touch
// targets for the arena's own controls. Supabase and the API are mocked (arena-mocks.ts).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
] as const;

const THEMES = ['dark', 'light'] as const;

async function openArena(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByTestId('arena')).toBeVisible();
}

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
  await page.exposeFunction('reportPolishCsp', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      (window as unknown as { reportPolishCsp: (text: string) => void }).reportPolishCsp(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  return violations;
}

type Box = { x: number; y: number; width: number; height: number };

const intersects = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error('no bounding box');
  return found;
}

test.describe('model picker (P1-11)', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`opens clear of the heading, lists every model: ${viewport.label}, ${theme}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page);
        await openArena(page);
        await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
        const heading = page.getByRole('heading', { level: 1, name: /Pick two\./ });
        await expect(heading).toBeVisible();
        await page.getByRole('button', { name: /Model for answer A/ }).click();
        const picker = page.getByTestId('model-picker');
        await expect(picker).toBeVisible();
        await settle(page, 450);

        // Never over the heading, and inside the viewport.
        const list = await box(picker);
        expect(intersects(list, await box(heading)), 'picker covers the heading').toBe(false);
        expect(list.y).toBeGreaterThanOrEqual(0);
        expect(list.y + list.height).toBeLessThanOrEqual(viewport.height);
        await page.screenshot({
          path: shotPath(
            viewport.label === 'desktop'
              ? `arena-model-picker-${theme}`
              : `arena-model-picker-mobile-${theme}`,
          ),
        });

        // Every model of the board (Random + 53), in a list that scrolls.
        await expect(picker.getByRole('option')).toHaveCount(54);
        const scroller = picker.locator('[cmdk-list]');
        expect(
          await scroller.evaluate(element => element.scrollHeight > element.clientHeight),
        ).toBe(true);
        await expect(picker.getByText('Ranked', { exact: true })).toBeVisible();
        const top = picker.getByRole('option', { name: /Llama 3\.1 70B Instruct/ });
        await expect(top).toContainText('Meta');
        await expect(top).toContainText('#2');
        await expect(top).toHaveAttribute('title', '@cf/meta/llama-3.1-70b-instruct');

        // Not yet rated: their own group, no rank or rating, the raw id in the tooltip.
        const unrated = picker.getByRole('option', { name: /Gemma 3n E4B IT/ });
        await unrated.scrollIntoViewIfNeeded();
        await expect(picker.getByText('Not yet rated', { exact: true })).toBeVisible();
        await expect(unrated).toContainText('Google');
        await expect(unrated).not.toContainText('#');
        await expect(unrated).toHaveAttribute('title', 'gemma-3n-e4b-it');
        if (viewport.label === 'desktop') {
          await picker
            .locator('[cmdk-group-heading]', { hasText: 'Not yet rated' })
            .evaluate(element => element.scrollIntoView({ block: 'start' }));
          await settle(page, 200);
          await page.screenshot({ path: shotPath(`arena-model-picker-unrated-${theme}`) });
        }
        await unrated.click();
        await expect(
          page.getByRole('button', { name: /Model for answer A: Gemma 3n E4B IT/ }),
        ).toBeVisible();
      });
    }
  }

  test('the docked composer opens its list upwards', async ({ page }) => {
    await mockArena(page);
    await openArena(page, '/?thread=t-haiku');
    await expect(page.getByTestId('turn').first()).toBeVisible();
    const trigger = page.getByRole('button', { name: /Model for answer A/ });
    await trigger.click();
    const picker = page.getByTestId('model-picker');
    await expect(picker).toBeVisible();
    await settle(page, 400);
    expect((await box(picker)).y + (await box(picker)).height).toBeLessThanOrEqual(
      (await box(trigger)).y + 1,
    );
  });
});

test.describe('syntax highlighting', () => {
  test('code blocks get colours lazily, under the enforced CSP, with copy unchanged', async ({
    page,
  }) => {
    const problems = collectProblems(page);
    const csp = await cspViolations(page);
    const scripts: string[] = [];
    page.on('request', request => {
      if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
    });
    await mockArena(page);
    await openArena(page);
    await settle(page, 500);
    // No code block on screen: no grammar downloaded.
    expect(scripts.filter(path => /\/assets\/python-[\w-]+\.js$/.test(path))).toEqual([]);

    await openArena(page, '/?thread=t-recursion');
    const block = page.getByTestId('turn').first().getByRole('figure', { name: 'Code, python' });
    const pre = block.locator('pre');
    await expect(pre).toHaveAttribute('data-highlighted', 'true', { timeout: 15_000 });
    expect(scripts.some(path => /\/assets\/python-[\w-]+\.js$/.test(path))).toBe(true);

    const keyword = pre.locator('span', { hasText: /^def$/ }).first();
    await expect(keyword).toHaveAttribute('style', /--code-token-keyword/);
    const [keywordColour, plainColour] = await Promise.all([
      keyword.evaluate(element => getComputedStyle(element).color),
      pre.evaluate(element => getComputedStyle(element).color),
    ]);
    expect(keywordColour).not.toBe(plainColour);
    await expect(pre).toContainText('return n * factorial(n - 1)');
    await expect(block.getByRole('button', { name: /Copy the python code/ })).toBeVisible();

    expect(csp).toEqual([]);
    expect(problems).toEqual([]);
  });

  for (const theme of THEMES) {
    test(`screenshot: a highlighted block, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await mockArena(page);
      await openArena(page, '/?thread=t-recursion');
      const block = page.getByTestId('turn').first().getByRole('figure', { name: 'Code, python' });
      await expect(block.locator('pre')).toHaveAttribute('data-highlighted', 'true', {
        timeout: 15_000,
      });
      // The thread sticks to its bottom while it loads: centre the block, let it settle, then
      // capture exactly its box.
      await block.evaluate(element => element.scrollIntoView({ block: 'center' }));
      await settle(page, 900);
      await page.screenshot({
        path: shotPath(`arena-code-block-${theme}`),
        clip: await box(block),
      });
    });
  }
});

test.describe('keyboard shortcuts overlay', () => {
  test('? opens it outside text fields, Esc closes it, focus returns', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });

    // Typing a question mark in the prompt box is just typing.
    await prompt.click();
    await page.keyboard.type('Is 9.11 bigger than 9.9?');
    await expect(prompt).toHaveValue('Is 9.11 bigger than 9.9?');
    await expect(dialog).toHaveCount(0);

    const surprise = page.getByRole('button', { name: 'Surprise me' });
    await surprise.focus();
    await page.keyboard.press('Shift+Slash');
    await expect(dialog).toBeVisible();
    for (const text of ['Open the command palette', 'Start a new battle', 'A is better', 'Tie']) {
      await expect(dialog.getByText(text, { exact: true })).toBeVisible();
    }
    expect(await dialog.locator('kbd[data-slot="kbd"]').count()).toBeGreaterThan(12);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(surprise).toBeFocused();

    // From the account menu: focus goes back to the menu's button.
    const account = page.getByRole('button', { name: /^Account:/ });
    await account.click();
    await page.getByRole('menuitem', { name: /Keyboard shortcuts/ }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(account).toBeFocused();

    // From the command palette.
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('keyboard shortcuts');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('turning single keys off in the overlay stops ?, the menu still opens it', async ({
    page,
  }) => {
    await mockArena(page);
    await openArena(page);
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Shift+Slash');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('switch').click();
    expect(await page.evaluate(() => window.localStorage.getItem('dm.arena.shortcuts'))).toBe(
      'off',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Shift+Slash');
    await page.waitForTimeout(300);
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByRole('menuitem', { name: /Keyboard shortcuts/ }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('switch')).not.toBeChecked();
  });

  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`screenshot: the overlay, ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page);
        await openArena(page);
        await page.getByRole('button', { name: /^Account:/ }).click();
        await page.getByRole('menuitem', { name: /Keyboard shortcuts/ }).click();
        await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
        await settle(page, 450);
        await page.screenshot({ path: shotPath(`arena-shortcuts-${viewport.label}-${theme}`) });
      });
    }
  }
});

test.describe('phone polish (P2-9)', () => {
  for (const theme of THEMES) {
    test(`starter rows scroll with snap points, edge fades and a cue, ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await storeTheme(page, theme);
      await mockArena(page);
      await openArena(page);
      await settle(page, 600);
      const row = page.locator('[data-scroll-row]').first();
      const scroller = row.locator('[data-scroller]');
      const metrics = await scroller.evaluate(element => ({
        overflows: element.scrollWidth > element.clientWidth + 1,
        snap: getComputedStyle(element).scrollSnapType,
      }));
      expect(metrics.overflows).toBe(true);
      expect(metrics.snap).toContain('x');
      await expect(scroller).toHaveAttribute('data-fade', 'end');
      await expect(row.getByTestId('scroll-cue')).toBeVisible();
      const starters = page.getByRole('region', { name: 'Prompt starters' });
      await starters.screenshot({ path: shotPath(`arena-starters-mobile-${theme}`) });

      await scroller.evaluate(element => element.scrollTo({ left: element.scrollWidth }));
      await expect(scroller).toHaveAttribute('data-fade', 'start');
      await expect(row.getByTestId('scroll-cue')).toHaveCount(0);
      if (theme === 'dark') {
        await settle(page, 200);
        await starters.screenshot({ path: shotPath('arena-starters-mobile-end-dark') });
      }
      // The last category is reachable and works.
      await page.getByRole('button', { name: 'Fun', exact: true }).click();
      await expect(page.getByRole('button', { name: /haiku about merge conflicts/ })).toBeVisible();
    });
  }

  test('on wide screens the rows wrap: no fade, no cue', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    await settle(page, 500);
    for (const scroller of await page.locator('[data-scroller]').all()) {
      await expect(scroller).not.toHaveAttribute('data-fade', /.+/);
    }
    await expect(page.getByTestId('scroll-cue')).toHaveCount(0);
  });

  test('history rows: the time under the title on a phone, at the end on a desktop', async ({
    page,
  }) => {
    await mockArena(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openArena(page);
    await page.getByRole('button', { name: 'Open the history' }).click();
    const drawer = page.getByRole('dialog', { name: 'History' });
    await expect(drawer).toBeVisible();
    await settle(page, 500);
    for (const link of await drawer.getByRole('link').all()) {
      const title = link.locator('span').first();
      const time = link.getByTestId('thread-time');
      const [titleBox, timeBox] = [await box(title), await box(time)];
      expect(timeBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
      // The title is not cut to a few words: at most two lines, nothing hidden past them.
      expect(
        await title.evaluate(element => element.scrollHeight <= element.clientHeight + 1),
      ).toBe(true);
    }

    // On a desktop the history is the same slide-over (Stage), wide enough for one row each.
    await page.setViewportSize({ width: 1440, height: 900 });
    await openArena(page);
    await page.getByRole('button', { name: 'Open the history' }).click();
    const panel = page
      .getByRole('dialog', { name: 'History' })
      .getByRole('navigation', { name: 'Your threads' });
    await expect(panel).toBeVisible();
    await settle(page, 500);
    const link = panel.getByRole('link').first();
    const [titleBox, timeBox] = [
      await box(link.locator('span').first()),
      await box(link.getByTestId('thread-time')),
    ];
    expect(
      Math.abs(titleBox.y + titleBox.height / 2 - (timeBox.y + timeBox.height / 2)),
    ).toBeLessThan(4);
  });
});

/**
 * The pointer target of every element the locator matches: its box, or the `hit-area`
 * pseudo-element when that is larger (it is centred on the element and takes the taps).
 */
async function targetSizes(locator: Locator) {
  return locator.evaluateAll(elements =>
    elements.map(element => {
      const rect = element.getBoundingClientRect();
      const pseudo = getComputedStyle(element, '::before');
      const extends_ = pseudo.content !== 'none' && pseudo.position === 'absolute';
      return {
        name: (element.getAttribute('aria-label') ?? element.textContent ?? '').trim().slice(0, 40),
        width: Math.max(rect.width, extends_ ? parseFloat(pseudo.width) || 0 : 0),
        height: Math.max(rect.height, extends_ ? parseFloat(pseudo.height) || 0 : 0),
      };
    }),
  );
}

async function expectTouchSized(locator: Locator, what: string) {
  const sizes = await targetSizes(locator);
  expect(sizes.length, `${what}: none found`).toBeGreaterThan(0);
  expect(
    sizes.filter(size => size.width < 43.5 || size.height < 43.5),
    `${what}: under 44x44`,
  ).toEqual([]);
}

test.describe('button feel on touch screens', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the arena controls are 44 px targets under a coarse pointer', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const form = page.getByRole('form', { name: 'Prompt' });
    await expectTouchSized(form.locator('label:has(input[type="radio"])'), 'mode switch');
    await expectTouchSized(
      page.getByRole('group', { name: 'Starter category' }).getByRole('button'),
      'starter categories',
    );
    await expectTouchSized(page.getByRole('button', { name: 'Surprise me' }), 'Surprise me');

    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Explain recursion');
    const send = page.getByRole('button', { name: 'Send' });
    await expectTouchSized(send, 'send');
    await send.click();
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    await expectTouchSized(
      turn.getByRole('group', { name: 'Your verdict' }).getByRole('button'),
      'vote',
    );
    await turn.getByRole('button', { name: /B is better/ }).click();
    await expect(turn).toHaveAttribute('data-phase', 'revealed');
    await expectTouchSized(turn.getByRole('button', { name: /^Copy/ }), 'copy');
    await expectTouchSized(page.getByRole('button', { name: 'Share', exact: true }), 'share');
  });
});
