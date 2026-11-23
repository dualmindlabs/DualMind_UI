import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { passGate, settle, shotPath, storeTheme } from './helpers';

// The site shell on /design/ (it uses the real header and footer): the keyboard path through the
// header, the command palette, the phone menu, toasts, axe with overlays open, and screenshots of
// the UI kit and shell sections (added to the `web-screenshots` artifact).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

const palette = (page: Page) => page.getByRole('dialog', { name: 'Command palette' });

/**
 * axe on an open overlay. While a modal is open Base UI hides the rest of the page with
 * aria-hidden (the page itself is checked closed in design.spec.ts), so the scan covers the
 * dialog.
 */
async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .include('[role="dialog"]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      violation =>
        `${violation.id} (${violation.impact}): ${violation.nodes
          .slice(0, 3)
          .map(node => node.target.join(' '))
          .join(', ')}`,
    );
}

test.describe('header and command palette (desktop)', () => {
  test('keyboard: skip link, home, the four nav links, then the palette trigger', async ({
    page,
  }) => {
    await page.goto('/design/');
    await settle(page, 300);
    const banner = page.getByRole('banner');
    const nav = banner.getByRole('navigation', { name: 'Main' });

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(banner.getByRole('link', { name: 'DualMind Arena, home' })).toBeFocused();
    for (const name of ['Arena', 'Leaderboard', 'Models', 'How it works']) {
      await page.keyboard.press('Tab');
      await expect(nav.getByRole('link', { name, exact: true })).toBeFocused();
    }
    await page.keyboard.press('Tab');
    const trigger = banner.getByRole('button', { name: /^Search/ });
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');

    // Enter opens the palette with focus in the search field; Esc closes it and focus returns.
    await page.keyboard.press('Enter');
    await expect(palette(page)).toBeVisible();
    await expect(palette(page).getByRole('combobox')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('Ctrl+K opens the palette anywhere; Esc closes it and focus returns', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);
    const vote = page.getByRole('button', { name: 'B is better' });
    await vote.focus();

    await page.keyboard.press('Control+K');
    await expect(palette(page)).toBeVisible();
    await expect(palette(page).getByRole('combobox')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
    await expect(vote).toBeFocused();
  });

  test('typing filters the commands and Enter runs the selected one', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);

    // A theme command: the page switches without leaving.
    // Wait for the palette's input before typing: keys pressed while it is still opening are lost.
    await page.keyboard.press('Control+K');
    await expect(palette(page).getByRole('combobox')).toBeFocused();
    await page.keyboard.type('light theme');
    await expect(palette(page).getByRole('option', { selected: true })).toContainText(
      'Use the light theme',
    );
    await page.keyboard.press('Enter');
    await expect(palette(page)).toBeHidden();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // A page: Enter navigates (the leaderboard is still a legacy page, so a full load).
    await page.keyboard.press('Control+K');
    await expect(palette(page).getByRole('combobox')).toBeFocused();
    await page.keyboard.type('leader');
    const selected = palette(page).getByRole('option', { selected: true });
    await expect(selected).toContainText('Leaderboard');
    await expect(palette(page).getByRole('option', { name: /Models/ })).toHaveCount(0);
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/leaderboard\/$/);
  });

  test('the header condenses into a pill on scroll', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);
    const header = page.locator('header[data-slot="site-header"]');
    await expect(header).not.toHaveAttribute('data-condensed');
    await page.mouse.wheel(0, 900);
    await expect(header).toHaveAttribute('data-condensed', '');
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(header).not.toHaveAttribute('data-condensed');
  });

  test('the model picker filters and picks with the keyboard', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);
    await page.getByRole('button', { name: /Atlas 2/ }).click();
    await expect(page.getByRole('combobox', { name: 'Pick a model for Mind A' })).toBeFocused();
    await page.keyboard.type('bore');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Borealis/ })).toBeVisible();
  });

  test('a toast appears in the polite Notifications live region', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);
    await page.getByRole('button', { name: 'Vote saved' }).click();
    const region = page.getByRole('region', { name: /Notifications/ });
    await expect(region).toHaveAttribute('aria-live', 'polite');
    await expect(region.getByText('Model names are revealed.')).toBeVisible();
  });
});

test.describe('phone menu (390 x 844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens a focus-trapped drawer; Esc closes it and focus returns', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);
    const menuButton = page.getByRole('banner').getByRole('button', { name: 'Open the menu' });
    await menuButton.click();

    const drawer = page.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'Sign in' })).toBeVisible();

    // Focus cycles inside the drawer, however often Tab is pressed. At the wrap-around, Base UI's
    // focus guard takes focus for a moment and hands it back, so poll rather than read once.
    const focusInside = () =>
      page.evaluate(() => !!document.activeElement?.closest('[data-testid="mobile-nav"]'));
    for (let step = 0; step < 16; step += 1) {
      await page.keyboard.press('Tab');
      await expect.poll(focusInside, { message: `Tab ${step + 1}`, timeout: 2000 }).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('the close button closes the drawer', async ({ page }) => {
    await page.goto('/design/');
    await settle(page, 300);
    await page.getByRole('banner').getByRole('button', { name: 'Open the menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu' });
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(drawer).toBeHidden();
  });
});

for (const theme of ['dark', 'light'] as const) {
  test(`axe: no serious or critical violations with the palette open (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await storeTheme(page, theme);
    await page.goto('/design/');
    await settle(page, 300);
    await page.keyboard.press('Control+K');
    await expect(palette(page)).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });

  test(`axe: no serious or critical violations with the phone menu open (${theme})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await storeTheme(page, theme);
    await page.goto('/design/');
    await settle(page, 300);
    await page.getByRole('banner').getByRole('button', { name: 'Open the menu' }).click();
    await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const modes = [
  { name: 'dark', theme: 'dark', reducedMotion: 'no-preference' },
  { name: 'light', theme: 'light', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', theme: 'dark', reducedMotion: 'reduce' },
] as const;

for (const viewport of viewports) {
  for (const mode of modes) {
    test(`screenshot: UI kit and shell, ${viewport.name} ${mode.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      await storeTheme(page, mode.theme);
      await page.goto('/design/');
      await settle(page);
      const name = (part: string) => shotPath(`shell-${viewport.name}-${mode.name}-${part}`);
      // Section captures scroll the page; keep the sticky page header out of them.
      const hideHeader = 'header[data-slot="site-header"] { visibility: hidden !important; }';

      await page
        .locator('#components')
        .screenshot({ path: name('components'), animations: 'disabled', style: hideHeader });
      await page
        .locator('#shell')
        .screenshot({ path: name('shell'), animations: 'disabled', style: hideHeader });
      await page
        .locator('footer')
        .last()
        .screenshot({ path: name('footer'), animations: 'disabled', style: hideHeader });

      // The header after scrolling: the condensed pill over the page.
      await page.locator('#colour').scrollIntoViewIfNeeded();
      await page.waitForTimeout(700);
      await page.screenshot({ path: name('header-condensed'), animations: 'disabled' });

      // The command palette, filtered.
      await page.keyboard.press('Control+K');
      await expect(palette(page)).toBeVisible();
      await expect(palette(page).getByRole('combobox')).toBeFocused();
      await page.keyboard.type('the');
      await page.waitForTimeout(400);
      await page.screenshot({ path: name('palette'), animations: 'disabled' });
      await page.keyboard.press('Escape');
      await expect(palette(page)).toBeHidden();

      if (viewport.name === 'mobile') {
        await page.getByRole('banner').getByRole('button', { name: 'Open the menu' }).click();
        await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
        await page.waitForTimeout(600);
        await page.screenshot({ path: name('menu'), animations: 'disabled' });
        await page.keyboard.press('Escape');
      }

      await page.getByRole('button', { name: 'Offline' }).click();
      await page.getByRole('button', { name: 'Vote saved' }).click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: name('toasts'), animations: 'disabled' });
    });
  }
}
