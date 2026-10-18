import { expect, test } from '@playwright/test';
import { mockStats, scrollThrough, settle, shotPath } from './helpers';

// Screenshots for review, at desktop (1440x900) and mobile (360x780) sizes.
test.beforeEach(async ({ page }) => {
  await mockStats(page);
});

test('hero and full page', async ({ page }, testInfo) => {
  await page.goto('/?ref=arena');
  await settle(page, 3200);
  await page.screenshot({ path: shotPath(testInfo, '01-hero') });
  await scrollThrough(page);
  await page.screenshot({ path: shotPath(testInfo, '02-full'), fullPage: true });
});

test('signup states: success, duplicate, invalid', async ({ page }, testInfo) => {
  await page.goto('/');
  await settle(page);
  const input = page.getByLabel('Email address');

  await input.fill('ada@example.com');
  await input.press('Enter');
  await expect(page.getByTestId('signup-success')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: shotPath(testInfo, '03-success') });

  await page.reload();
  await settle(page);
  await input.fill('ada@example.com');
  await input.press('Enter');
  await expect(page.locator('#signup-status')).toContainText('already on the list');
  await page.screenshot({ path: shotPath(testInfo, '04-duplicate') });

  await input.fill('ada@');
  await input.press('Enter');
  await expect(page.locator('#signup-status')).toContainText('Enter a valid email address');
  await page.screenshot({ path: shotPath(testInfo, '05-error') });
});

test('reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await settle(page, 1500);
  await page.screenshot({ path: shotPath(testInfo, '06-reduced-motion') });
  await scrollThrough(page);
  await page.screenshot({ path: shotPath(testInfo, '07-reduced-motion-full'), fullPage: true });
});

test('battle demo after a vote, and the live leaderboard', async ({ page }, testInfo) => {
  await page.goto('/');
  await settle(page, 800);
  const battle = page.getByTestId('battle');
  await battle.scrollIntoViewIfNeeded();
  // Let both answers stream in, then vote.
  await page.waitForTimeout(6500);
  await page.getByRole('button', { name: 'B is better' }).click();
  await page.waitForTimeout(1800);
  await battle.screenshot({ path: shotPath(testInfo, '08-battle') });

  const board = page.locator('#leaderboard');
  await board.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2800);
  await board.screenshot({ path: shotPath(testInfo, '09-leaderboard') });
});
