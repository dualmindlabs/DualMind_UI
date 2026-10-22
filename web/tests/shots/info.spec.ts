import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

// Review screenshots of the info pages (slice E): About, How it works, FAQ (one answer open),
// Credits, Privacy and the API reference, at desktop and phone, in dark and light.

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
  { id: 'info-about', url: '/about/' },
  { id: 'info-how-it-works', url: '/how-it-works/' },
  { id: 'info-faq', url: '/faq/', open: true },
  { id: 'info-credits', url: '/credits/' },
  { id: 'info-privacy', url: '/privacy/' },
  { id: 'info-developers', url: '/developers/' },
];

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`info ${vp.name} ${theme}`, () => {
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
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          if (route.open) {
            await page.getByRole('button', { name: /\?$/ }).first().click();
          }
          await capture(page, route.id, vp.name, theme);
        });
      }
    });
  }
}
