import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Slice A2 review screenshots: the duel in every state. Waiting (skeletons, locked dock), writing
// (caret, motion on), awaiting the vote, the reveal, the phone Compare view, a backup answer
// (unrated) and a failed battle. Desktop 1440 and phone 390, dark and light.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;
const PROMPT = 'Design a cache for a read-heavy API and show the code';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
  ]);
});

async function shoot(page: Page, name: string, vp: string, theme: string, full = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  await page.screenshot({
    path: path.join(OUT, `${name}__${vp}__${theme}.png`),
    fullPage: full,
  });
  await handle.evaluate(node => (node as Element).remove());
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
    test.describe(`duel ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
      });

      test('waiting and writing (motion on)', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 5000 });
        await send(page);
        await expect(page.getByTestId('vote-bar-locked')).toBeVisible();
        await shoot(page, 'duel-1-waiting', vp.name, theme, false);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
        await page.waitForTimeout(450);
        await shoot(page, 'duel-2-writing', vp.name, theme, false);
      });

      test('vote and reveal (motion on)', async ({ page }) => {
        await open(page, theme);
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await shoot(page, 'duel-3-vote', vp.name, theme);
        await turn.getByRole('button', { name: /B is better/ }).click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await page.waitForTimeout(2200);
        await shoot(page, 'duel-4-reveal', vp.name, theme);
      });

      test('failed and backup-answer states', async ({ page }) => {
        await open(page, theme, { battle: 'unavailable' });
        await send(page);
        await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 });
        await shoot(page, 'duel-5-failed', vp.name, theme, false);
      });

      test('backup answer, unrated', async ({ page }) => {
        await open(page, theme, { battle: 'fallback' });
        await send(page);
        await expect(page.getByTestId('unrated-note')).toBeVisible({ timeout: 20_000 });
        await shoot(page, 'duel-6-unrated', vp.name, theme);
      });

      if (vp.phone) {
        test('phone compare view', async ({ page }) => {
          await open(page, theme);
          await send(page);
          const turn = page.getByTestId('live-turn').first();
          await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
          await turn.getByRole('button', { name: 'Compare', exact: true }).click();
          await page.waitForTimeout(400);
          await shoot(page, 'duel-7-compare', vp.name, theme);
        });
      }
    });
  }
}
