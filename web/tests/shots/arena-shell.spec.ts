import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Review screenshots of the arena shell (slice A1): the empty arena with its hero prompt box, the
// matchmaking beat, the battle stage with the docked prompt box, the history slide-over, the
// shortcuts overlay and Side by side. Desktop and phone, dark and light. Motion is reduced, so the
// captures are the settled state. Each capture is best effort: "before" runs this spec against the
// base branch, which lacks some of these states, and must not fail the job.

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

async function shot(page: Page, name: string, vp: string, theme: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, `shell-${name}__${vp}__${theme}.png`) });
}

/** Runs a step; a state the base branch does not have is skipped, not failed. */
async function soft(step: () => Promise<void>) {
  try {
    await step();
  } catch (error) {
    console.log(`skipped: ${(error as Error).message.split('\n')[0]}`);
  }
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`shell ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
      });

      test('empty, typing, side by side', async ({ page }) => {
        await mockArena(page);
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        await shot(page, '1-empty', vp.name, theme);

        await soft(async () => {
          await page.getByRole('textbox', { name: 'Your prompt' }).fill(PROMPT);
          await page.getByRole('button', { name: 'Reasoning' }).click({ timeout: 3000 });
          await shot(page, '2-typing', vp.name, theme);
        });
        await soft(async () => {
          await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
          await shot(page, '3-side', vp.name, theme);
        });
      });

      test('matchmaking beat', async ({ page }) => {
        await mockArena(page, { battleDelayMs: 6000 });
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        await page.getByRole('textbox', { name: 'Your prompt' }).fill(PROMPT);
        await page.keyboard.press('Enter');
        await soft(async () => {
          await expect(page.getByTestId('matchmaking')).toBeVisible({ timeout: 3000 });
        });
        await shot(page, '4-matchmaking', vp.name, theme);
      });

      test('stage, history slide-over, shortcuts', async ({ page }) => {
        await mockArena(page);
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        await page.getByRole('textbox', { name: 'Your prompt' }).fill(PROMPT);
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await shot(page, '5-stage', vp.name, theme);

        await soft(async () => {
          await page.getByRole('button', { name: 'Open the history' }).click({ timeout: 3000 });
          await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
          await shot(page, '6-history', vp.name, theme);
          await page.keyboard.press('Escape');
          await expect(page.getByRole('dialog', { name: 'History' })).toBeHidden();
        });
        await soft(async () => {
          await page.getByRole('button', { name: /^Account:/ }).click();
          await page.getByRole('menuitem', { name: /Keyboard shortcuts/ }).click();
          await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
          await shot(page, '7-shortcuts', vp.name, theme);
        });
      });
    });
  }
}
