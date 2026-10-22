import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Arena concept "Console" screenshots: empty, writing (blind and side by side with live stats),
// the vote dock, the key press burst, the ranking reveal, the inspector, the history slide-over and
// the phone compare view. Desktop 1440 and phone 390, dark and light.

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

async function shoot(
  page: Page,
  name: string,
  vp: string,
  theme: string,
  full = true,
  settle = 700,
) {
  await page.evaluate(() => document.fonts.ready);
  if (settle > 0) await page.waitForTimeout(settle);
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
    test.describe(`console ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
      });

      test('empty', async ({ page }) => {
        await open(page, theme);
        await shoot(page, 'console-1-empty', vp.name, theme, false);
      });

      test('writing, blind', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 4000 });
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
        await page.waitForTimeout(350);
        await shoot(page, 'console-2-writing-blind', vp.name, theme, false, 0);
      });

      test('writing, side by side (live stats)', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 4000 });
        await page.getByText('Side by side', { exact: true }).first().click();
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
        await page.waitForTimeout(600);
        await shoot(page, 'console-3-writing-side', vp.name, theme, false, 0);
      });

      test('vote, burst, reveal, inspector, history', async ({ page }) => {
        await open(page, theme);
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await shoot(page, 'console-4-vote', vp.name, theme, false);
        await turn.getByRole('button', { name: /B is better/ }).click();
        await shoot(page, 'console-5-burst', vp.name, theme, false, 0);
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await page.waitForTimeout(2600);
        await shoot(page, 'console-6-reveal', vp.name, theme);
        await page.getByRole('button', { name: /Inspector/ }).click();
        await page.waitForTimeout(700);
        await shoot(page, 'console-7-inspector', vp.name, theme, false);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await page.getByRole('button', { name: 'Open the history' }).click();
        await page.waitForTimeout(700);
        await shoot(page, 'console-8-history', vp.name, theme, false);
      });

      if (vp.phone) {
        test('phone compare view', async ({ page }) => {
          await open(page, theme);
          await send(page);
          const turn = page.getByTestId('live-turn').first();
          await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
          await turn.getByRole('button', { name: 'Compare', exact: true }).click();
          await page.waitForTimeout(400);
          await shoot(page, 'console-9-compare', vp.name, theme);
        });
      }
    });
  }
}
