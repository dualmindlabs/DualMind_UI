import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Arena concept "Focus": one answer at a time. Waiting, reading A, reading B (the vote pill
// rises), Compare, the reveal mid-turn and settled, a long answer, a failed and a backup-answer
// battle. Desktop 1440 and phone 390, dark and light.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;
const PROMPT = 'Design a cache for a read-heavy API and show the code';

const PARAGRAPH =
  'A read-heavy API earns its keep from a cache that is close to the caller, cheap to invalidate and honest about staleness. Start with the read path: what is asked for most, how often it changes, and what a wrong answer costs.';
const LONG_A = [
  '## The short answer',
  PARAGRAPH,
  '- Put an in-process LRU in front of every instance.',
  '- Add a shared cache only when instances miss on the same keys.',
  '```ts\nclass Lru<K, V> {\n  private map = new Map<K, V>();\n  constructor(private max: number) {}\n  get(key: K) {\n    const value = this.map.get(key);\n    if (value === undefined) return undefined;\n    this.map.delete(key);\n    this.map.set(key, value);\n    return value;\n  }\n}\n```',
  '## Invalidation',
  PARAGRAPH,
  PARAGRAPH,
  '## What to measure',
  PARAGRAPH,
  PARAGRAPH,
].join('\n\n');
const LONG_B = [
  '## Start from the keys',
  PARAGRAPH,
  PARAGRAPH,
  '| Layer | Hit cost | Staleness |\n| --- | --- | --- |\n| In process | 1 us | seconds |\n| Shared | 1 ms | seconds |\n| Origin | 40 ms | none |',
  PARAGRAPH,
  PARAGRAPH,
].join('\n\n');

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
  ]);
});

async function shoot(page: Page, name: string, vp: string, theme: string, full = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.screenshot({ path: path.join(OUT, `${name}__${vp}__${theme}.png`), fullPage: full });
}

async function send(page: Page) {
  const prompt = page.getByRole('textbox', { name: 'Your prompt' });
  await prompt.fill(PROMPT);
  await prompt.click();
  await page.keyboard.press('Enter');
}

async function open(page: Page, theme: string, options: Parameters<typeof mockArena>[1] = {}) {
  await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
  await mockArena(page, options);
  await page.goto('/?arena=new');
  await expect(page.getByTestId('arena')).toBeVisible();
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`focus ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
      });

      test('empty, waiting and writing', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 5000 });
        await shoot(page, 'focus-0-empty', vp.name, theme);
        await send(page);
        await page.waitForTimeout(900);
        await shoot(page, 'focus-1-waiting', vp.name, theme);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
        await page.waitForTimeout(500);
        await shoot(page, 'focus-2-writing', vp.name, theme);
      });

      test('read A, read B, the vote pill rises', async ({ page }) => {
        await open(page, theme, { answers: { a: LONG_A, b: LONG_B } });
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await expect(turn.getByTestId('vote-hint')).toBeVisible();
        await shoot(page, 'focus-3-read-a', vp.name, theme);
        await turn.locator('[data-end="a"]').scrollIntoViewIfNeeded();
        await turn.getByRole('button', { name: 'Answer B', exact: true }).click();
        await page.waitForTimeout(500);
        await shoot(page, 'focus-4-read-b', vp.name, theme);
        await turn.locator('[data-end="b"]').scrollIntoViewIfNeeded();
        await expect(turn.getByTestId('vote-bar')).toBeVisible({ timeout: 10_000 });
        await shoot(page, 'focus-5-vote-pill', vp.name, theme);
      });

      test('compare', async ({ page }) => {
        await open(page, theme);
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await turn.getByRole('button', { name: 'Compare', exact: true }).click();
        await page.waitForTimeout(500);
        await shoot(page, 'focus-6-compare', vp.name, theme);
      });

      test('reveal, mid-turn and settled', async ({ page }) => {
        await open(page, theme);
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await turn.locator('[data-end="a"]').scrollIntoViewIfNeeded();
        await turn.getByRole('button', { name: 'Answer B', exact: true }).click();
        await turn.locator('[data-end="b"]').scrollIntoViewIfNeeded();
        await expect(turn.getByTestId('vote-bar')).toBeVisible({ timeout: 10_000 });
        await turn.getByRole('button', { name: /B is better/ }).click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await page.waitForTimeout(450);
        await shoot(page, 'focus-7-reveal-turning', vp.name, theme);
        await page.waitForTimeout(2300);
        await shoot(page, 'focus-8-reveal', vp.name, theme);
      });

      test('failed and backup-answer states', async ({ page }) => {
        await open(page, theme, { battle: 'unavailable' });
        await send(page);
        await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 });
        await shoot(page, 'focus-9-failed', vp.name, theme);
      });
    });
  }
}
