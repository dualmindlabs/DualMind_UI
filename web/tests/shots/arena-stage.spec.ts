import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Arena concept "Stage": the cinematic duel in every moment, for the review sheets. The empty
// arena, the matchmaking beat, writing (the dock locked), the top of the stage and the vote
// (idle, leaning toward A, B pressed, and the pill at 360 px), the reveal mid-flip and settled,
// a failed battle, a backup answer (unrated) and the history slide-over. Desktop 1440 and
// phone 390, dark and light, motion on.

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
    path: path.join(OUT, `stage-${name}__${vp}__${theme}.png`),
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

/** Sends the prompt and waits for both answers: the vote is open. */
async function toVote(page: Page) {
  await send(page);
  const turn = page.getByTestId('live-turn').first();
  await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
  return turn;
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

      test('empty and matchmaking', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 6000 });
        await page.waitForTimeout(600);
        await shoot(page, '01-empty', vp.name, theme, false);
        await send(page);
        // A short beat; the shot is still useful (the locked stage) if it has already passed.
        await page
          .getByTestId('matchmaking')
          .waitFor({ timeout: 3000 })
          .catch(() => undefined);
        await page.waitForTimeout(500);
        await shoot(page, '02-matchmaking', vp.name, theme, false);
      });

      test('writing', async ({ page }) => {
        await open(page, theme, { battleDelayMs: 5000 });
        await send(page);
        await expect(page.getByTestId('vote-bar-locked')).toBeVisible();
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'answering', { timeout: 15_000 });
        await page.waitForTimeout(500);
        await shoot(page, '03-writing', vp.name, theme, false);
      });

      test('vote then reveal', async ({ page }) => {
        await open(page, theme);
        const turn = await toVote(page);
        await page.waitForTimeout(900);
        await turn.evaluate(node => node.scrollIntoView({ block: 'start' }));
        await page.evaluate(() => window.scrollTo(0, 0));
        await shoot(page, '04-stage-top', vp.name, theme, false);
        await turn.getByTestId('vote-bar').scrollIntoViewIfNeeded();
        await shoot(page, '05-vote', vp.name, theme, false);
        const a = turn.getByRole('button', { name: /A is better/ });
        const b = turn.getByRole('button', { name: /B is better/ });
        if (!vp.phone) {
          await a.hover();
          await page.waitForTimeout(700);
          const handle = await page.addStyleTag({
            content: '[data-slot="site-header"] { position: static !important; }',
          });
          await page.screenshot({
            path: path.join(OUT, `stage-06-vote-leans-a__${vp.name}__${theme}.png`),
          });
          await handle.evaluate(node => (node as Element).remove());
        }
        await b.click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await page.waitForTimeout(350);
        await shoot(page, '07-flip', vp.name, theme, false);
        await page.waitForTimeout(2200);
        await shoot(page, '08-reveal-top', vp.name, theme, false);
        await turn.getByTestId('reveal-panel').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await shoot(page, '09-reveal-verdict', vp.name, theme, false);
      });

      test('failed battle', async ({ page }) => {
        await open(page, theme, { battle: 'unavailable' });
        await send(page);
        await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 20_000 });
        await shoot(page, '10-failed', vp.name, theme, false);
      });

      test('backup answer, unrated', async ({ page }) => {
        await open(page, theme, { battle: 'fallback' });
        await send(page);
        const note = page.getByTestId('unrated-note');
        await expect(note).toBeVisible({ timeout: 20_000 });
        await note.scrollIntoViewIfNeeded();
        await shoot(page, '11-unrated', vp.name, theme, false);
      });

      test('history slide-over', async ({ page }) => {
        await open(page, theme);
        await toVote(page);
        await page.getByRole('button', { name: 'Open the history' }).click();
        await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
        await shoot(page, '12-history', vp.name, theme, false);
      });

      if (vp.phone) {
        test('the vote pill at 360 px', async ({ page }) => {
          await page.setViewportSize({ width: 360, height: 740 });
          await open(page, theme);
          const turn = await toVote(page);
          await page.waitForTimeout(900);
          await turn.getByTestId('vote-bar').scrollIntoViewIfNeeded();
          await shoot(page, '05-vote-360', vp.name, theme, false);
        });
      }
    });
  }
}
