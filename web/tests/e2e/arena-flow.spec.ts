import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, type Route, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// The signed-in arena flow on desktop (docs/redesign/status.md, resume plan step 7): a long
// answer under a long model name, the vote bar that stays on screen, code and tables that scroll
// inside their pane, the reveal header that stays one row at 1440, 1280 and 1024 px, focus and
// the next steps after the vote, the keys, reduced motion, errors and both themes. Supabase and
// the API are answered by Playwright routes (arena-mocks.ts).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

const LONG_NAME = 'Llama 3.3 70B Instruct (FP8, fast)';
const PROMPT = 'Design a cache for a read-heavy API and show the code';
const PROBLEM = 'https://arena.dualmindlab.tech/problems/';

const PARAGRAPH =
  'A cache only pays off when reads repeat. Measure the hit rate first: below about 60% the extra memory and the invalidation work cost more than they save, and a faster query is the better fix.';

/**
 * Long enough for several screens, with a long code line, a wide table and an unbroken token.
 * Blocks are joined by blank lines; the lines of a code block or a table by single newlines.
 */
const LONG_A = [
  '## A plan for a read-heavy API',
  PARAGRAPH,
  '1. **Measure** the hit rate and the p99 latency before and after.',
  '2. **Pick** a strategy per endpoint, not one for the whole service.',
  '3. **Invalidate** on writes, and give every entry a time to live as a safety net.',
  [
    '```ts',
    'export function memoize<Args extends unknown[], Result>(fn: (...args: Args) => Result, key: (...args: Args) => string = (...args) => JSON.stringify(args), ttlMs = 60_000): (...args: Args) => Result {',
    '  const cache = new Map<string, { value: Result; expires: number }>();',
    '  return (...args) => {',
    '    const id = key(...args);',
    '    const hit = cache.get(id);',
    '    if (hit && hit.expires > Date.now()) return hit.value;',
    '    const value = fn(...args);',
    '    cache.set(id, { value, expires: Date.now() + ttlMs });',
    '    return value;',
    '  };',
    '}',
    '```',
  ].join('\n'),
  [
    '| Strategy | Hit rate | p50 latency | p99 latency | Memory | Eviction | Thread safe | Best for |',
    '| --- | ---: | ---: | ---: | ---: | --- | --- | --- |',
    '| LRU | 91% | 0.4 ms | 3.1 ms | 120 MB | least recently used | yes | most read-heavy services |',
    '| LFU | 93% | 0.5 ms | 3.4 ms | 140 MB | least frequently used | yes | stable hot keys |',
    '| TTL only | 78% | 0.3 ms | 2.2 ms | 90 MB | expiry time | yes | data that goes stale fast |',
    '| Write-through | 88% | 0.6 ms | 4.0 ms | 160 MB | on write | with a lock | strict consistency |',
  ].join('\n'),
  PARAGRAPH,
  'Keys look like `user:42:profile:v3:region-eu-west-1:locale-en-US:feature-flags-7f3a9c2e1b5d4f60`, and a key that long must still wrap inside the pane: userprofilecachekeywithoutanyspacesorbreakopportunitiesatallforthelayouttest.',
  '## Invalidation',
  PARAGRAPH,
  PARAGRAPH,
  '## Stampedes',
  'When a hot key expires, a thousand requests miss at once and all go to the database. Let one request refill the entry while the others wait for it, or serve the stale value for a few seconds.',
  PARAGRAPH,
  PARAGRAPH,
  '## What to watch',
  '- Hit rate per endpoint.',
  '- Memory per entry, and the eviction rate.',
  '- p99 latency on a miss, not only on a hit.',
  PARAGRAPH,
].join('\n\n');

const LONG_B = [
  'Start with the simplest thing that works: an in-process LRU in front of the slowest query.',
  PARAGRAPH,
  '- Keep entries small.',
  '- Version the keys, so a deploy never reads an old shape.',
  '- Log every miss for a week before tuning anything.',
  PARAGRAPH,
  [
    '```python',
    'from functools import lru_cache',
    '',
    '@lru_cache(maxsize=10_000)',
    'def profile(user_id: int) -> dict:',
    '    return db.fetch_one("SELECT id, name, email, locale, region, created_at, updated_at FROM users WHERE id = %s", user_id)',
    '```',
  ].join('\n'),
  PARAGRAPH,
  PARAGRAPH,
  'Move to a shared cache only when several instances miss on the same keys.',
].join('\n\n');

async function openArena(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByTestId('arena')).toBeVisible();
}

async function sendBattle(page: Page, prompt = PROMPT) {
  // This turn by position: `.last()` would follow later turns.
  const index = await page.getByTestId('live-turn').count();
  await page.getByRole('textbox', { name: 'Your prompt' }).fill(prompt);
  await page.keyboard.press('Enter');
  const turn = page.getByTestId('live-turn').nth(index);
  await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
  return turn;
}

/** Votes with a key, the way a keyboard user does: from the page, not a text field. */
async function voteWithKey(page: Page, turn: Locator, key: '1' | '2' | '3' | '4') {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press(key);
  await expect(turn).toHaveAttribute('data-phase', 'revealed');
}

/** Page-level horizontal overflow: scroll containers (code, tables, the phone pane row) clip. */
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

interface HeaderGeometry {
  side: string;
  height: number;
  /** How far apart the vertical centres of the header's parts are (0 on one row). */
  spread: number;
  nameRight: number | null;
  nameClipped: boolean | null;
  title: string | null;
  pickLeft: number | null;
  pickRight: number | null;
  copyLeft: number | null;
  copyRight: number | null;
  headerRight: number;
  metaInHeader: boolean;
}

/** Where the parts of each pane header sit, after the reveal. */
async function headerGeometry(turn: Locator): Promise<HeaderGeometry[]> {
  return turn.locator('section[data-side]').evaluateAll(sections =>
    sections.map(section => {
      const header = section.querySelector('header');
      if (!header) throw new Error('a pane without a header');
      const name = header.querySelector<HTMLElement>('[data-testid="pane-model"]');
      const pick = header.querySelector('[data-testid="pane-pick"]');
      const copy = header.querySelector('button');
      const badge = header.querySelector('[data-slot="role-badge"]');
      const parts = [badge, name, pick, copy].filter((part): part is Element => part !== null);
      const centres = parts.map(part => {
        const box = part.getBoundingClientRect();
        return box.top + box.height / 2;
      });
      return {
        side: section.getAttribute('data-side') ?? '',
        height: header.getBoundingClientRect().height,
        spread: Math.max(...centres) - Math.min(...centres),
        nameRight: name ? name.getBoundingClientRect().right : null,
        // scrollWidth is rounded up; more than a pixel past the box is a real ellipsis.
        nameClipped: name ? name.scrollWidth - name.getBoundingClientRect().width > 1 : null,
        title: name ? name.getAttribute('title') : null,
        pickLeft: pick ? pick.getBoundingClientRect().left : null,
        pickRight: pick ? pick.getBoundingClientRect().right : null,
        copyLeft: copy ? copy.getBoundingClientRect().left : null,
        copyRight: copy ? copy.getBoundingClientRect().right : null,
        headerRight: header.getBoundingClientRect().right,
        metaInHeader: header.querySelector('[data-testid="pane-meta"]') !== null,
      };
    }),
  );
}

function expectStableHeaders(headers: HeaderGeometry[], label: string) {
  expect(headers, label).toHaveLength(2);
  const [a, b] = headers as [HeaderGeometry, HeaderGeometry];
  // One row, the same height on both sides: nothing wraps on one side only.
  expect(a.spread, `${label}: A on one row`).toBeLessThan(8);
  expect(b.spread, `${label}: B on one row`).toBeLessThan(8);
  expect(Math.abs(a.height - b.height), `${label}: equal heights`).toBeLessThan(1);
  expect(a.height, `${label}: header height`).toBeLessThan(56);
  for (const header of headers) {
    expect(header.metaInHeader, `${label} ${header.side}: timing in the footer`).toBe(false);
    if (header.pickLeft !== null && header.nameRight !== null) {
      expect(header.nameRight, `${label} ${header.side}: name before the pick`).toBeLessThanOrEqual(
        header.pickLeft + 0.5,
      );
    }
    const before = header.pickRight ?? header.nameRight;
    if (before !== null && header.copyLeft !== null) {
      expect(before, `${label} ${header.side}: copy after the name`).toBeLessThanOrEqual(
        header.copyLeft + 0.5,
      );
    }
    if (header.copyRight !== null) {
      expect(header.copyRight, `${label} ${header.side}: inside`).toBeLessThanOrEqual(
        header.headerRight + 0.5,
      );
    }
  }
  expect(a.title, `${label}: the full name in the tooltip`).toBe(LONG_NAME);
}

/** A screenshot of the top of both panes: the two headers and the first lines. */
async function shootHeaders(page: Page, turn: Locator, name: string) {
  const a = turn.locator('section[data-side="a"]');
  const b = turn.locator('section[data-side="b"]');
  await a.evaluate(element => element.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(200);
  const boxA = await a.boundingBox();
  const boxB = await b.boundingBox();
  if (!boxA || !boxB) throw new Error('no panes');
  await page.screenshot({
    path: shotPath(name),
    clip: {
      x: Math.max(0, boxA.x - 12),
      y: Math.max(0, boxA.y - 12),
      width: boxB.x + boxB.width - boxA.x + 24,
      height: 132,
    },
  });
}

test.describe('long answers', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`1280x800 ${theme}: sticky vote bar, inner scroll, stable header`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await storeTheme(page, theme);
      await mockArena(page, { answers: { a: LONG_A, b: LONG_B } });
      await openArena(page);
      const turn = await sendBattle(page);
      const answerA = turn.getByRole('region', { name: /Answer A/ });
      const answerB = turn.getByRole('region', { name: /Answer B/ });

      // In the middle of the long answer the vote bar is still on screen (sticky).
      const table = answerA.getByRole('region', { name: 'Table' });
      await table.scrollIntoViewIfNeeded();
      // Code highlighting loads as blocks come on screen; let it settle, then look again.
      await page.waitForTimeout(400);
      await table.scrollIntoViewIfNeeded();
      await expect(table).toBeInViewport();
      await expect(turn.getByTestId('vote-bar')).toBeInViewport({ ratio: 1 });

      // Wide content scrolls inside its pane; the page itself never scrolls sideways.
      const scrolls = async (locator: Locator) =>
        locator.evaluate(element => element.scrollWidth > element.clientWidth + 1);
      expect(await scrolls(table), 'table scrolls inside').toBe(true);
      expect(await scrolls(answerA.locator('pre').first()), 'code scrolls inside A').toBe(true);
      expect(await scrolls(answerB.locator('pre').first()), 'code scrolls inside B').toBe(true);
      const paneA = await answerA.boundingBox();
      const tableBox = await table.boundingBox();
      expect(tableBox && paneA && tableBox.x + tableBox.width <= paneA.x + paneA.width + 0.5).toBe(
        true,
      );
      expect(await overflowing(page)).toEqual([]);
      await settle(page, 400);
      await page.screenshot({ path: shotPath(`arena-long-vote-1280-${theme}`) });

      await voteWithKey(page, turn, '1');
      const panel = turn.getByTestId('reveal-panel');
      await expect(panel).toBeFocused();
      await expect(panel).toBeInViewport();
      await expect(page.getByTestId('arena-announcer')).toContainText(
        `You voted A. Model A was ${LONG_NAME}. Model B was Compound Mini.`,
      );
      // The names decrypt (about 1 s) and the charge fades (about 2 s).
      await settle(page, 2600);
      expect(await overflowing(page)).toEqual([]);
      expectStableHeaders(await headerGeometry(turn), `1280 ${theme}`);
      await expect(panel.getByTestId('reveal-name').first()).toHaveText(
        new RegExp(`${LONG_NAME.replace(/[()]/g, '\\$&')}.*Your pick`),
      );
      await page.screenshot({ path: shotPath(`arena-reveal-actions-1280-${theme}`) });
      await shootHeaders(page, turn, `arena-long-revealed-1280-${theme}`);
      await page.screenshot({ path: shotPath(`arena-long-revealed-top-1280-${theme}`) });
    });
  }
});

test.describe('the reveal header', () => {
  for (const width of [1440, 1280, 1024] as const) {
    for (const theme of width === 1024 ? (['dark', 'light'] as const) : (['dark'] as const)) {
      test(`stays one row at ${width} px, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await storeTheme(page, theme);
        await mockArena(page);
        await openArena(page);
        const turn = await sendBattle(page, 'Explain recursion to a ten-year-old');
        await voteWithKey(page, turn, '1');
        await settle(page, 1600);
        const headers = await headerGeometry(turn);
        expectStableHeaders(headers, `${width} ${theme}`);
        // Whether the name ends in an ellipsis at this width, for the report (1024 px does).
        test.info().annotations.push({
          type: 'name-clipped',
          description: `${width}px: ${String(headers[0]?.nameClipped)}`,
        });
        expect(await overflowing(page)).toEqual([]);
        await shootHeaders(page, turn, `arena-reveal-header-${width}-${theme}`);
      });
    }
  }
});

test.describe('after the vote', () => {
  test('focus lands on the next steps; Tab, Enter and the keys drive them', async ({ page }) => {
    const state = await mockArena(page);
    await openArena(page);
    const first = await sendBattle(page);
    await voteWithKey(page, first, '1');
    const panel = first.getByTestId('reveal-panel');
    await expect(panel).toBeFocused();
    await expect(panel).toHaveAccessibleName('Your verdict: A is better');

    // The vote keys do nothing more once the vote is in.
    await page.keyboard.press('3');
    await expect(first.getByTestId('verdict')).toContainText('A is better');
    expect(state.bodies.filter(item => item.path === '/api/arena/model-vote')).toHaveLength(1);

    // ? opens the shortcuts; Esc brings focus back into the next steps (the panel itself is not
    // tabbable, so the dialog returns to its first action).
    await page.keyboard.press('?');
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel.getByRole('button', { name: /Ask a follow-up/ })).toBeFocused();

    // Tab from the panel: follow-up, rematch, share, new battle, in reading order.
    await panel.focus();
    const order: string[] = [];
    for (let index = 0; index < 4; index += 1) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() =>
          (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        ),
      );
    }
    expect(order).toEqual(['Ask a follow-up/', 'Rematch', 'Share this battle', 'New battleN']);

    // Share opens the dialog for this battle; Esc returns to the button.
    const share = panel.getByRole('button', { name: 'Share this battle' });
    await share.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Share this battle' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(share).toBeFocused();

    // A follow-up from the panel: the prompt box, then a second turn on the same pair.
    await panel.getByRole('button', { name: /Ask a follow-up/ }).press('Enter');
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });
    await expect(prompt).toBeFocused();
    await prompt.fill('Now add a stampede guard');
    await page.keyboard.press('Enter');
    const second = page.getByTestId('live-turn').nth(1);
    await expect(second).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    // The first turn keeps a plain verdict; the next steps belong to the newest turn.
    await expect(first.getByTestId('reveal-panel')).toHaveCount(0);
    await expect(first.getByTestId('verdict')).toContainText('A is better');
    await voteWithKey(page, second, '2');
    await expect(page.getByTestId('reveal-panel')).toHaveCount(1);
    await expect(second.getByTestId('reveal-panel')).toBeFocused();

    // Rematch: a new battle with the same prompt in the box, focused and not sent.
    const battlesBefore = state.bodies.filter(item => item.path === '/api/arena/dualchat').length;
    await second.getByRole('button', { name: 'Rematch' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(prompt).toHaveValue('Now add a stampede guard');
    await expect(prompt).toBeFocused();
    await expect(page.getByTestId('arena-announcer')).toContainText('same prompt');
    expect(state.bodies.filter(item => item.path === '/api/arena/dualchat')).toHaveLength(
      battlesBefore,
    );
    await page.keyboard.press('Enter');
    const rematch = page.getByTestId('live-turn').first();
    await expect(rematch).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    const battles = state.bodies.filter(item => item.path === '/api/arena/dualchat');
    // A new thread, and no pair asked for: two models picked at random again.
    expect(battles.at(-1)?.body.threadId).not.toBe(battles[0]?.body.threadId);
    expect(battles.at(-1)?.body.model1).toBeUndefined();

    // New battle from the panel (N works too, see arena.spec.ts).
    await voteWithKey(page, rematch, '4');
    await page
      .getByTestId('reveal-panel')
      .getByRole('button', { name: /New battle/ })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('live-turn')).toHaveCount(0);
    await expect(prompt).toBeFocused();
    await expect(prompt).toHaveValue('');
    // The next prompt starts a thread of its own, and its turn is on screen.
    const fresh = await sendBattle(page, 'One more battle');
    await expect(page).toHaveURL(/\?thread=t-new-/);
    const threads = state.bodies
      .filter(item => item.path === '/api/arena/dualchat')
      .map(item => item.body.threadId);
    expect(new Set(threads).size).toBe(3);
    await expect(fresh.getByRole('region', { name: /Answer A/ })).toBeVisible();
  });

  test('a mouse vote moves focus off the vanished vote bar too', async ({ page }) => {
    await mockArena(page);
    await openArena(page);
    const turn = await sendBattle(page);
    await turn.getByRole('button', { name: /B is better/ }).click();
    await expect(turn).toHaveAttribute('data-phase', 'revealed');
    await expect(turn.getByTestId('reveal-panel')).toBeFocused();
  });

  test('reduced motion: the names and the next steps at once, focus still moves', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1280, height: 800 });
    await mockArena(page, { answers: { a: LONG_A, b: LONG_B } });
    await openArena(page);
    const turn = await sendBattle(page);
    await voteWithKey(page, turn, '1');
    const name = turn.getByTestId('pane-model').first();
    // No scrambled glyphs at any point: the plain name is there at once.
    await expect(name).toContainText(LONG_NAME);
    await expect(name.locator('.text-muted')).toHaveCount(0);
    const panel = turn.getByTestId('reveal-panel');
    await expect(panel).toBeFocused();
    expect(await panel.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    expectStableHeaders(await headerGeometry(turn), 'reduced motion');
    await settle(page, 300);
    await page.screenshot({ path: shotPath('arena-reveal-reduced-motion-1280') });
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe on the reveal with the next steps, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await mockArena(page, { answers: { a: LONG_A, b: LONG_B } });
      await openArena(page);
      const turn = await sendBattle(page);
      await voteWithKey(page, turn, '1');
      await settle(page, 2600);
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
      expect(blocking).toEqual([]);
    });
  }
});

test.describe('errors', () => {
  test('a failed battle shows no empty panes, and Try again recovers', async ({ page }) => {
    await mockArena(page);
    // Registered last, so it answers first.
    const fail = (route: Route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: `${PROBLEM}internal`,
          title: 'Internal server error',
          status: 500,
        }),
      });
    await page.route('**/api/arena/dualchat', fail);
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill(PROMPT);
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'error', { timeout: 15_000 });
    await expect(turn.getByRole('alert')).toContainText('The answers did not arrive.');
    await expect(turn.getByRole('region', { name: /Answer/ })).toHaveCount(0);
    await expect(turn.getByRole('button', { name: /^Copy/ })).toHaveCount(0);
    await settle(page, 300);
    await page.screenshot({ path: shotPath('arena-battle-failed-clean-dark') });

    await page.unroute('**/api/arena/dualchat', fail);
    await turn.getByRole('button', { name: /Try again/ }).click();
    await expect(page.getByTestId('live-turn').last()).toHaveAttribute(
      'data-phase',
      'awaiting_vote',
      { timeout: 15_000 },
    );
  });
});

test.describe('README', () => {
  test('screenshot: a revealed battle with the next steps, dark', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await storeTheme(page, 'dark');
    await mockArena(page);
    await openArena(page);
    const turn = await sendBattle(page, 'Explain recursion to a ten-year-old');
    await turn.getByRole('button', { name: /A is better/ }).click();
    await expect(turn).toHaveAttribute('data-phase', 'revealed');
    await settle(page, 2600);
    // The whole turn on screen, from the prompt to the next steps, with no focus ring.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await turn.evaluate(element => element.scrollIntoView({ block: 'start' }));
    await settle(page, 300);
    await page.screenshot({ path: shotPath('readme-arena-reveal-dark') });
  });
});
