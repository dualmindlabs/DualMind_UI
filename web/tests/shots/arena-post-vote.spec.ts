import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// After-the-vote review screenshots (backend PRs 70 and 71 on DualMind_Back, both flagged off):
// the Truth vs Taste answer key row, the Cross-examine strip before and after the critique with a
// rebuttal under each answer, the second vote's outcome, and the same reveal with the flags OFF,
// which must look like an ordinary reveal. The API is answered by Playwright routes
// (tests/e2e/arena-mocks.ts); the questions, answers and rebuttals are synthetic.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
  ]);
});

async function capture(page: Page, name: string, vp: string, theme: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `postvote-${name}__${vp}__${theme}.png`) });
}

async function reveal(page: Page) {
  await page.goto('/?arena=new');
  await expect(page.getByTestId('arena')).toBeVisible();
  const prompt = page.getByRole('textbox', { name: 'Your prompt' });
  await prompt.fill('What is 17 x 23?');
  await prompt.click();
  await page.keyboard.press('Enter');
  const turn = page.getByTestId('live-turn').first();
  await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
  await turn.getByRole('button', { name: /A is better/ }).click();
  await expect(turn).toHaveAttribute('data-phase', 'revealed');
  await page.waitForTimeout(2200);
  return turn;
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`after the vote ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(value => window.localStorage.setItem('dm.theme', value), theme);
      });

      test('truth vs taste: the answer key row', async ({ page }) => {
        await mockArena(page, { truth: true });
        const turn = await reveal(page);
        await expect(page.getByTestId('answer-key')).toBeVisible();
        await turn.scrollIntoViewIfNeeded();
        await page.getByTestId('answer-key').scrollIntoViewIfNeeded();
        await capture(page, '1-answer-key', vp.name, theme);
      });

      test('truth vs taste: a sample item where both sides miss', async ({ page }) => {
        await mockArena(page, { truth: { sample: true, bothWrong: true } });
        await reveal(page);
        await page.getByTestId('answer-key').scrollIntoViewIfNeeded();
        await capture(page, '2-answer-key-sample', vp.name, theme);
      });

      test('cross-examine: strip, rebuttals, second vote', async ({ page }) => {
        await mockArena(page, { crossExamine: true });
        const turn = await reveal(page);
        const strip = page.getByTestId('cross-examine');
        await expect(strip).toBeVisible();
        await strip.scrollIntoViewIfNeeded();
        await capture(page, '3-cross-examine-strip', vp.name, theme);

        await strip.getByRole('button', { name: 'Ask for the critique' }).click();
        await expect(turn.getByTestId('rebuttal')).toHaveCount(2);
        await turn.getByTestId('rebuttal').first().scrollIntoViewIfNeeded();
        await capture(page, '4-rebuttals', vp.name, theme);

        await page
          .getByRole('group', { name: 'Vote again, optional' })
          .getByRole('button', { name: 'B is better' })
          .click();
        await expect(page.getByTestId('cross-examine-outcome')).toBeVisible();
        await page.getByTestId('cross-examine').scrollIntoViewIfNeeded();
        await capture(page, '5-second-vote', vp.name, theme);
      });

      test('both on, with a failed critique', async ({ page }) => {
        await mockArena(page, {
          truth: true,
          crossExamine: { fail: { call: 'critique', status: 503, code: 'CRITIQUE_UNAVAILABLE' } },
        });
        await reveal(page);
        await page.getByRole('button', { name: 'Ask for the critique' }).click();
        await expect(page.getByTestId('critique-error')).toBeVisible();
        await page.getByTestId('cross-examine').scrollIntoViewIfNeeded();
        await capture(page, '6-critique-error', vp.name, theme);
      });

      test('flags off: an ordinary reveal, nothing extra', async ({ page }) => {
        await mockArena(page);
        await reveal(page);
        await expect(page.getByTestId('answer-key')).toHaveCount(0);
        await expect(page.getByTestId('cross-examine')).toHaveCount(0);
        await page.getByTestId('reveal-panel').scrollIntoViewIfNeeded();
        await capture(page, '7-flags-off', vp.name, theme);
      });
    });
  }
}
