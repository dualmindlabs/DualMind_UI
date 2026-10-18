import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DEVICE_KEY, LEGACY_KEY, mockSignup, mockStats } from './helpers';

// Behaviour checks run once, at desktop size. The signup endpoint is mocked (see helpers.ts);
// tests/api.spec.ts covers the real handler.
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Behaviour is checked on desktop only');
  await mockStats(page);
});

const readDevice = (page: Page) => page.evaluate(key => window.localStorage.getItem(key), DEVICE_KEY);

async function submit(page: Page, email: string) {
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Email address').press('Enter');
}

test('the page is prerendered: the HTML already has the headline and the form', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('Two models.');
  expect(html).toContain('id="email"');
  expect(html).not.toContain('<!--app-html-->');
});

test('loads and hydrates without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('live-strip')).toContainText('53');
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('a valid email is posted to /api/signup, lower-cased with the ref, and the device remembers it', async ({ page }) => {
  const signups = await mockSignup(page);
  await page.goto('/?ref=arena');
  await page.getByLabel('Email address').fill('  Harsh.Test@Example.com ');
  await page.getByRole('button', { name: 'Join the waitlist' }).first().click();
  await expect(page.getByTestId('signup-success')).toContainText("You're on the list.");
  await expect(page.getByTestId('signup-success')).toContainText('harsh.test@example.com');
  // Exactly these fields: the honeypot is only sent when something filled it.
  expect(signups.requests).toEqual([{ email: 'harsh.test@example.com', ref: 'arena' }]);
  expect(await readDevice(page)).toBe('harsh.test@example.com');

  await page.reload();
  await expect(page.getByTestId('signup-hint')).toContainText("You've already joined from this device as harsh.test@example.com");
});

test('an email already on the list is reported as a duplicate', async ({ page }) => {
  await mockSignup(page, { known: ['dup@example.com'] });
  await page.goto('/');
  await submit(page, 'DUP@example.com');
  await expect(page.locator('#signup-status')).toContainText('dup@example.com is already on the list');
  expect(await readDevice(page)).toBe('dup@example.com');
});

test('an invalid email shows an error and sends nothing', async ({ page }) => {
  const signups = await mockSignup(page);
  await page.goto('/');
  const input = page.getByLabel('Email address');
  await input.fill('not-an-email');
  await input.press('Enter');
  await expect(page.locator('#signup-status')).toContainText('Enter a valid email address');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toBeFocused();
  await input.fill('');
  await input.press('Enter');
  await expect(page.locator('#signup-status')).toContainText('Enter a valid email address');
  expect(signups.requests).toEqual([]);
  expect(await readDevice(page)).toBeNull();
});

test('an email the server rejects (400) is shown as invalid', async ({ page }) => {
  await mockSignup(page, { status: 400 });
  await page.goto('/');
  await submit(page, 'ada@localhost');
  await expect(page.locator('#signup-status')).toContainText('Enter a valid email address');
  await expect(page.getByLabel('Email address')).toHaveAttribute('aria-invalid', 'true');
});

for (const [name, options, message] of [
  ['500', { status: 500 }, "We couldn't save your spot"],
  ['no answer', { abort: true }, "We couldn't save your spot"],
  ['429', { status: 429 }, 'Too many tries from this network'],
] as const) {
  test(`${name}: a clear error, and the email stays in the field to retry`, async ({ page }) => {
    await mockSignup(page, options);
    await page.goto('/');
    await submit(page, 'retry@example.com');
    await expect(page.locator('#signup-status')).toContainText(message);
    await expect(page.getByLabel('Email address')).toHaveValue('retry@example.com');
    expect(await readDevice(page)).toBeNull();
  });
}

test('an email the old page kept only in this browser is offered again, and sent for real', async ({ page }) => {
  const signups = await mockSignup(page);
  await page.addInitScript(key => window.localStorage.setItem(key, JSON.stringify(['old@example.com'])), LEGACY_KEY);
  await page.goto('/');
  await expect(page.getByTestId('signup-hint')).toContainText('Our old page only saved old@example.com in this browser');
  await expect(page.getByLabel('Email address')).toHaveValue('old@example.com');
  await page.getByLabel('Email address').press('Enter');
  await expect(page.getByTestId('signup-success')).toContainText('old@example.com');
  expect(signups.requests).toEqual([{ email: 'old@example.com' }]);
});

test('the honeypot field is off screen and out of the tab order', async ({ page }) => {
  await page.goto('/');
  const honeypot = page.locator('input[name="website"]');
  await expect(honeypot).toHaveAttribute('tabindex', '-1');
  const box = await honeypot.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(0);
});

test('ref=arena is read from the URL and explained; junk refs are ignored', async ({ page }) => {
  await page.goto('/?ref=arena');
  await expect(page.getByTestId('ref-note')).toContainText('That Arena link brings you here until launch.');
  await page.goto('/?ref=%3Cscript%3E');
  await expect(page.getByTestId('live-strip')).toBeVisible();
  await expect(page.getByTestId('ref-note')).toHaveCount(0);
});

test('the battle demo takes a vote and explains the result', async ({ page }) => {
  await page.goto('/');
  await page.locator('#try').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'B is better' }).click();
  await expect(page.getByTestId('battle-result')).toContainText('You picked the answer that actually answered.');
  await expect(page.getByTestId('battle-result')).toContainText('written for this demo');
  await page.getByRole('button', { name: 'Next prompt' }).click();
  await expect(page.getByTestId('battle')).toContainText('Explain quantum entanglement simply');
});

test('the leaderboard shows the live top five', async ({ page }) => {
  await page.goto('/');
  const board = page.getByTestId('leaderboard');
  await board.scrollIntoViewIfNeeded();
  await expect(board.locator('tbody tr')).toHaveCount(5);
  await expect(board.locator('tbody tr').first()).toContainText('llama-3.3-70b-instruct-fp8-fast');
});

test('if the leaderboard API fails, the page says so and invents nothing', async ({ page }) => {
  // Registered last, so it runs before the beforeEach mock.
  await mockStats(page, 'fail');
  await page.goto('/');
  await expect(page.getByTestId('live-strip')).toContainText('50+ models');
  await expect(page.getByTestId('leaderboard')).toContainText('didn’t load just now');
});

test('no serious accessibility violations (axe, WCAG 2.1 AA)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2500);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  console.log(
    results.violations.map(v => `${v.impact} ${v.id}: ${v.nodes.length} node(s) ${v.nodes[0]?.target.join(' ')}`).join('\n') ||
      'axe: no violations',
  );
  expect(serious, serious.map(v => `${v.id}: ${v.help}`).join('\n')).toEqual([]);
});
