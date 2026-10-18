import { expect, test, type Page } from '@playwright/test';
import { mockStats, settle, shotPath } from './helpers';

// The `dist-endpoint` build, made with VITE_WAITLIST_ENDPOINT=/api/waitlist and served on 4174.
test.use({ baseURL: 'http://localhost:4174' });

test.beforeEach(async ({ page }) => {
  await mockStats(page);
});

async function submit(page: Page, email: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Email address').press('Enter');
}

test('201: joined, and the request carries the email and the ref', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Behaviour is checked on desktop only');
  let body: unknown = null;
  await page.route('**/api/waitlist', async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/?ref=arena');
  await expect(page.getByTestId('ref-note')).toBeVisible();
  await submit(page, 'New@Example.com');
  await expect(page.getByTestId('signup-success')).toBeVisible();
  expect(body).toEqual({ email: 'new@example.com', ref: 'arena' });
});

test('409: already on the list', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Behaviour is checked on desktop only');
  await page.route('**/api/waitlist', route => route.fulfill({ status: 409, body: '' }));
  await page.goto('/');
  await submit(page, 'dup@example.com');
  await expect(page.locator('#signup-status')).toContainText('already on the list');
});

test('500: a clear error, the email stays in the field to retry', async ({ page }, testInfo) => {
  await page.route('**/api/waitlist', route => route.fulfill({ status: 500, body: '' }));
  await page.goto('/');
  await settle(page);
  await submit(page, 'retry@example.com');
  await expect(page.locator('#signup-status')).toContainText("We couldn't save your spot");
  await expect(page.getByLabel('Email address')).toHaveValue('retry@example.com');
  await page.waitForTimeout(400);
  await page.screenshot({ path: shotPath(testInfo, '10-network-error') });
});
