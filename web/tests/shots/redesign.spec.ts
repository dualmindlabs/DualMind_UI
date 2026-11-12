import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Review screenshots: landing, arena (empty, awaiting a vote, revealed), leaderboard, models, 404
// and the design page, at desktop and phone, in dark and light. The focus is blurred and the
// pointer parked before every capture so no stuck focus ring ends up in a shot. Motion is
// reduced so the captures are the settled state.

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

async function capture(page: Page, name: string, vp: string, theme: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  // Lazy content: scroll through once, then back to the top.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  await page.screenshot({ path: path.join(OUT, `${name}__${vp}__${theme}.png`), fullPage: true });
  await handle.evaluate(node => (node as Element).remove());
}

const PAGES = [
  { id: 'landing', url: '/' },
  { id: 'leaderboard', url: '/leaderboard/' },
  { id: 'models', url: '/models/' },
  { id: 'not-found-404', url: '/this-page-does-not-exist' },
  { id: 'design', url: '/design/' },
];

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      for (const route of PAGES) {
        test(route.id, async ({ page }) => {
          await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
          await page.goto(route.url);
          await expect(page.locator('main, body').first()).toBeVisible();
          await capture(page, route.id, vp.name, theme);
        });
      }

      test('arena: empty, awaiting vote, revealed', async ({ page }) => {
        await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
        await mockArena(page);
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        await capture(page, 'arena-1-empty', vp.name, theme);

        const prompt = page.getByRole('textbox', { name: 'Your prompt' });
        await prompt.fill(PROMPT);
        await prompt.click();
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await capture(page, 'arena-2-vote', vp.name, theme);

        await turn.getByRole('button', { name: /A is better/ }).click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await capture(page, 'arena-3-reveal', vp.name, theme);
      });
    });
  }
}
