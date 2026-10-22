import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Arena concept "Stage": the cinematic duel in its moments. Writing, the vote (idle, leaning
// toward A, B pressed), the reveal mid-flip and settled, history as a slide-over. Desktop 1440
// and phone 390, dark and light.

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
    test.describe(`stage ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
      });

      test('writing', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 5000 });
        await send(page);
        await expect(page.getByTestId('vote-bar-locked')).toBeVisible();
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
        await page.waitForTimeout(500);
        await shoot(page, 'stage-1-writing', vp.name, theme, false);
      });

      test('vote then reveal', async ({ page }) => {
        await open(page, theme);
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await page.waitForTimeout(900);
        await shoot(page, 'stage-2-vote', vp.name, theme, false);
        const a = turn.getByRole('button', { name: /A is better/ });
        const b = turn.getByRole('button', { name: /B is better/ });
        if (!vp.phone) {
          await a.hover();
          await page.waitForTimeout(700);
          const handle = await page.addStyleTag({
            content: '[data-slot="site-header"] { position: static !important; }',
          });
          await page.screenshot({
            path: path.join(OUT, `stage-3-vote-leans-a__${vp.name}__${theme}.png`),
          });
          await handle.evaluate(node => (node as Element).remove());
        }
        await b.click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await page.waitForTimeout(350);
        await shoot(page, 'stage-4-flip', vp.name, theme, false);
        await page.waitForTimeout(2200);
        await shoot(page, 'stage-5-reveal-top', vp.name, theme, false);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await turn.getByTestId('reveal-panel').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await shoot(page, 'stage-6-reveal-verdict', vp.name, theme, false);
      });

      test('history slide-over', async ({ page }) => {
        await open(page, theme);
        await send(page);
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await page.getByRole('button', { name: 'Open the history' }).click();
        await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
        await shoot(page, 'stage-7-history', vp.name, theme, false);
      });
    });
  }
}
