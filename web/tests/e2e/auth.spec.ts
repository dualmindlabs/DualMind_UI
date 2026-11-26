import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request, type Route, test } from '@playwright/test';

import { fullPageShot, passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';

// Slice S6: the sign-in pages through the real Worker, with every Supabase call answered by
// Playwright routes (the build uses the dummy project https://e2eproject.supabase.co, see
// web.yml), so no test reaches a real auth server. Password, email code, OAuth, sign-up,
// password reset, the two email-link pages, the legacy redirects, CSP, axe, overflow and the
// screenshots.

const SUPABASE = 'https://e2eproject.supabase.co';
const STORAGE_KEY = 'sb-e2eproject-auth-token';
const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };
const PASSWORD = 'Correct-Horse-9';
const STRONG = 'Tabs&Spaces-2026';

function jwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.c2lnbmF0dXJl`;
}

const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'ada@example.com',
  phone: '',
  email_confirmed_at: '2026-10-01T10:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Ada Lovelace' },
  identities: [],
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
};

function accessToken(): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt({
    sub: USER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: USER.email,
    iat: now,
    exp: now + 3600,
    session_id: 'session-e2e',
  });
}

function sessionBody() {
  return {
    access_token: accessToken(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'refresh-e2e',
    user: USER,
  };
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/** Answers a CORS preflight, allowing exactly the headers asked for (a `*` would not cover
 * Authorization). */
function preflight(route: Route) {
  return route.fulfill({
    status: 204,
    headers: {
      ...CORS,
      'access-control-allow-headers':
        route.request().headers()['access-control-request-headers'] ?? 'content-type',
      'access-control-max-age': '600',
    },
  });
}

interface SupabaseCalls {
  requests: Request[];
  find: (path: string) => Request | undefined;
}

/** Answers every call to the dummy Supabase project like the real auth server would. */
async function mockSupabase(
  page: Page,
  options: { wrongPassword?: boolean; pwnedPassword?: string } = {},
): Promise<SupabaseCalls> {
  const requests: Request[] = [];
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({
      status,
      headers: { ...CORS, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  await page.route(`${SUPABASE}/**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await preflight(route);
      return;
    }
    requests.push(request);
    const url = new URL(request.url());
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
    switch (url.pathname) {
      case '/auth/v1/token':
        if (options.wrongPassword && url.searchParams.get('grant_type') === 'password') {
          await json(route, 400, {
            code: 'invalid_credentials',
            error_code: 'invalid_credentials',
            msg: 'Invalid login credentials',
          });
          return;
        }
        await json(route, 200, sessionBody());
        return;
      case '/auth/v1/verify':
        if (body.token !== '123456') {
          await json(route, 403, {
            code: 'otp_expired',
            error_code: 'otp_expired',
            msg: 'Token has expired or is invalid',
          });
          return;
        }
        await json(route, 200, sessionBody());
        return;
      case '/auth/v1/user':
        await json(route, 200, USER);
        return;
      case '/auth/v1/signup':
        await json(route, 200, { ...USER, email_confirmed_at: null, email: body.email });
        return;
      case '/auth/v1/otp':
      case '/auth/v1/recover':
      case '/auth/v1/resend':
        await json(route, 200, {});
        return;
      case '/auth/v1/logout':
        await route.fulfill({ status: 204, headers: CORS });
        return;
      case '/auth/v1/authorize':
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<!doctype html><title>Provider</title><h1>Provider sign-in</h1>',
        });
        return;
      case '/functions/v1/email-wel-safe':
        await json(route, 200, { success: true, type: body.type });
        return;
      default:
        await json(route, 404, { msg: `unmocked ${url.pathname}` });
    }
  });

  // The breach check: a clean range unless a test names a "breached" password.
  await page.route('https://api.pwnedpasswords.com/range/*', async route => {
    if (route.request().method() === 'OPTIONS') {
      await preflight(route);
      return;
    }
    let lines = '0000000000000000000000000000000000A:0';
    if (options.pwnedPassword) {
      const { createHash } = await import('node:crypto');
      const hash = createHash('sha1').update(options.pwnedPassword).digest('hex').toUpperCase();
      lines += `\r\n${hash.slice(5)}:4242`;
    }
    await route.fulfill({ status: 200, headers: CORS, contentType: 'text/plain', body: lines });
  });

  // The profile sync (POST /api/users/sync) after sign-in.
  await page.route('**/api/users/sync', route => {
    requests.push(route.request());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, user: { user_id: USER.id, role: 'user' } }),
    });
  });

  return {
    requests,
    find: path => requests.find(request => new URL(request.url()).pathname === path),
  };
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function cspViolations(page: Page) {
  const violations: string[] = [];
  await page.exposeFunction('reportAuthCsp', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      (window as unknown as { reportAuthCsp: (text: string) => void }).reportAuthCsp(
        `${location.pathname}: ${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  return violations;
}

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
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

async function overflowing(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const clipped = (element: Element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) return false;
        const { overflowX } = getComputedStyle(parent);
        if (overflowX === 'hidden' || overflowX === 'clip') return true;
      }
      return false;
    };
    return [...document.querySelectorAll('body *')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > limit && !clipped(element);
      })
      .slice(0, 5)
      .map(
        element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
      );
  });
}

const RECOVERY_HASH = () =>
  `#access_token=${accessToken()}&expires_in=3600&refresh_token=refresh-e2e&token_type=bearer&type=recovery`;
const SIGNUP_HASH = () =>
  `#access_token=${accessToken()}&expires_in=3600&refresh_token=refresh-e2e&token_type=bearer&type=signup`;
const EXPIRED_HASH =
  '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

test.describe('URLs and headers', () => {
  for (const { url, title, text, robots } of [
    {
      url: '/login/',
      title: 'Sign in · DualMind Arena',
      text: 'Welcome back to the',
      robots: null,
    },
    {
      url: '/signup/',
      title: 'Create your account · DualMind Arena',
      text: 'Two models. One prompt.',
      robots: null,
    },
    {
      url: '/forgot-password/',
      title: 'Reset your password · DualMind Arena',
      text: 'Forgot your password?',
      robots: 'noindex, follow',
    },
  ]) {
    test(`${url} is prerendered with the enforced CSP and the Supabase origin`, async ({
      request,
    }) => {
      const response = await request.get(url, withCookie);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers['cache-control']).toBe('no-cache');
      const csp = headers['content-security-policy'] ?? '';
      expect(csp).toContain(`connect-src 'self' ${SUPABASE} wss://e2eproject.supabase.co`);
      expect(csp).toContain('https://api.pwnedpasswords.com');
      expect(headers['content-security-policy-report-only']).toBeUndefined();
      const html = await response.text();
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(text);
      expect(html).toContain(`<link rel="canonical" href="https://arena.dualmindlab.tech${url}"`);
      if (robots) expect(html).toContain(`content="${robots}"`);
      expect(html).not.toContain('data-spa-fallback');
    });
  }

  test('the old sign-in URLs answer 301 and keep the query (so ?redirect= survives)', async ({
    request,
    baseURL,
  }) => {
    for (const [from, to] of [
      ['/login-modern.html?redirect=%2Fleaderboard%2F', '/login/?redirect=%2Fleaderboard%2F'],
      ['/signup-modern.html?redirect=%2Fmodels%2F', '/signup/?redirect=%2Fmodels%2F'],
      ['/forgot-password.html', '/forgot-password/'],
      ['/login/index.html', '/login/'],
      ['/login/login/', '/login/'],
      ['/login/login/redirect.html', '/login/'],
      ['/auth-callback?type=signup', '/auth-callback.html?type=signup'],
      ['/update-password', '/update-password.html'],
    ] as const) {
      const response = await request.get(from, withCookie);
      expect(response.status(), from).toBe(301);
      expect(response.headers()['location'], from).toBe(`${baseURL}${to}`);
    }
  });

  test('the email targets render in place with status 200, never redirected', async ({
    request,
  }) => {
    for (const url of ['/auth-callback.html', '/update-password.html']) {
      const response = await request.get(`${url}?type=recovery`, withCookie);
      expect(response.status(), url).toBe(200);
      expect(response.headers()['content-security-policy'], url).toContain(SUPABASE);
      expect(await response.text(), url).toContain('data-spa-fallback');
    }
  });
});

test.describe('sign in', () => {
  test('with a password: lands on ?redirect, shares the session, syncs the profile', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const violations = await cspViolations(page);
    const calls = await mockSupabase(page);
    await page.goto('/login/?redirect=%2Fleaderboard%2F');
    await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/leaderboard/');

    const token = calls.find('/auth/v1/token');
    expect(new URL(token?.url() ?? '').searchParams.get('grant_type')).toBe('password');
    expect(token?.postDataJSON()).toMatchObject({ email: 'ada@example.com', password: PASSWORD });
    const stored = await page.evaluate(key => window.localStorage.getItem(key), STORAGE_KEY);
    expect(stored).toContain('refresh-e2e');
    const legacy = await page.evaluate(() => window.localStorage.getItem('dualmind.auth.supabase'));
    // No second copy of the tokens under the legacy key any more.
    expect(legacy).toBeNull();

    // On the next page the API client sends the user's token.
    await expect
      .poll(() => calls.find('/api/users/sync')?.headers()['authorization'])
      .toMatch(/^Bearer ey/);
    await expect
      .poll(() => calls.find('/functions/v1/email-wel-safe')?.postDataJSON() as unknown)
      .toMatchObject({ type: 'login' });
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
  });

  test('a wrong password gets a plain inline error, and focus stays in the form', async ({
    page,
  }) => {
    await mockSupabase(page, { wrongPassword: true });
    await page.goto('/login/');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('nope');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'That email and password do not match' }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login\/$/);
  });

  test('with an email code: send, type six digits, signed in', async ({ page }) => {
    const calls = await mockSupabase(page);
    await page.goto('/login/?redirect=%2Fmodels%2F');
    await page.getByRole('tab', { name: 'Email code' }).click();
    await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
    await page.getByRole('button', { name: 'Email me a code' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'We sent a 6-digit code to ada@example.com' }),
    ).toBeVisible();
    expect(calls.find('/auth/v1/otp')?.postDataJSON()).toMatchObject({ email: 'ada@example.com' });
    const code = page.getByRole('textbox', { name: 'Verification code' });
    await expect(code).toBeFocused();
    await expect(page.getByRole('button', { name: /Resend in \d+ s/ })).toBeDisabled();
    await code.fill('123456');
    await page.waitForURL('**/models/');
    expect(calls.find('/auth/v1/verify')?.postDataJSON()).toMatchObject({
      email: 'ada@example.com',
      token: '123456',
      type: 'email',
    });
  });

  test('the phone code tab is hidden while the phone sign-in flag is off', async ({ page }) => {
    const calls = await mockSupabase(page);
    await page.goto('/login/');
    await expect(page.getByRole('tab', { name: 'Email code' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Phone code' })).toHaveCount(0);
    await expect(page.getByText('or with your email', { exact: true })).toBeVisible();
    expect(calls.find('/auth/v1/otp')).toBeUndefined();
  });

  test('the OAuth buttons send the browser to the provider, returning to the callback page', async ({
    page,
    baseURL,
  }) => {
    await mockSupabase(page);
    await page.goto('/login/');
    await page.getByRole('button', { name: 'Continue with GitHub' }).click();
    await page.waitForURL(`${SUPABASE}/auth/v1/authorize**`);
    const authorize = new URL(page.url());
    expect(authorize.searchParams.get('provider')).toBe('github');
    // Tokens are read from the address only on the callback and reset pages (login CSRF).
    expect(authorize.searchParams.get('redirect_to')).toBe(`${baseURL}/auth-callback.html`);
    // Implicit flow: no PKCE challenge, so tokens come back in the hash to that page.
    expect(authorize.searchParams.get('code_challenge')).toBeNull();

    await page.goto('/login/');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await page.waitForURL(`${SUPABASE}/auth/v1/authorize**`);
    expect(new URL(page.url()).searchParams.get('provider')).toBe('google');
  });

  test('a signed-in visitor can continue or sign out, which clears the vote queue', async ({
    page,
  }) => {
    const calls = await mockSupabase(page);
    await page.goto('/login/?redirect=%2Fleaderboard%2F');
    await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/leaderboard/');
    await page.evaluate(() =>
      window.localStorage.setItem('dm.voteQueue.v1', '{"version":1,"votes":[]}'),
    );
    await page.goto('/login/');
    await expect(page.getByRole('heading', { name: 'You are signed in' })).toBeVisible();
    await expect(page.getByText('ada@example.com')).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
    expect(calls.find('/auth/v1/logout')).toBeTruthy();
    const keys = await page.evaluate(() => Object.keys(window.localStorage));
    expect(keys).not.toContain('dm.voteQueue.v1');
    expect(keys).not.toContain('dualmind.auth.supabase');
    expect(keys).not.toContain(STORAGE_KEY);
  });
});

test.describe('sign up and password reset', () => {
  test('sign-up checks the password, then says to confirm the email', async ({ page }) => {
    const calls = await mockSupabase(page, { pwnedPassword: 'Password-123' });
    await page.goto('/signup/');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByLabel('Name')).toBeFocused();

    await page.getByLabel('Name').fill('Ada Lovelace');
    await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('Password-123');
    await expect(page.getByText('Found in 4,242 data breaches')).toBeVisible();
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill(STRONG);
    await expect(page.getByText('Not found in known data breaches')).toBeVisible();
    await expect(page.getByText('Strength: Strong')).toBeVisible();
    await page.getByRole('textbox', { name: 'Confirm password' }).fill('different');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('The passwords do not match.')).toBeVisible();
    await page.getByRole('textbox', { name: 'Confirm password' }).fill(STRONG);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    const signup = calls.find('/auth/v1/signup');
    expect(signup?.postDataJSON()).toMatchObject({
      email: 'ada@example.com',
      password: STRONG,
      data: { full_name: 'Ada Lovelace' },
    });
    expect(new URL(signup?.url() ?? '').searchParams.get('redirect_to')).toMatch(
      /\/auth-callback\.html$/,
    );
  });

  test('forgot password: inline error, then the confirmation and a resend cooldown', async ({
    page,
    baseURL,
  }) => {
    const calls = await mockSupabase(page);
    await page.goto('/forgot-password/');
    await page.getByLabel('Email', { exact: true }).fill('ada@');
    await page.getByRole('button', { name: 'Send the reset link' }).click();
    await expect(page.getByText('Enter an email address like name@example.com.')).toBeVisible();
    await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
    await page.getByRole('button', { name: 'Send the reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Resend in \d+ s/ })).toBeDisabled();
    const recover = calls.find('/auth/v1/recover');
    expect(recover?.postDataJSON()).toMatchObject({ email: 'ada@example.com' });
    expect(new URL(recover?.url() ?? '').searchParams.get('redirect_to')).toBe(
      `${baseURL}/update-password.html`,
    );
  });
});

test.describe('email links', () => {
  test('a sign-up confirmation signs in, sends the welcome email and moves on', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const violations = await cspViolations(page);
    const calls = await mockSupabase(page);
    await page.goto(`/auth-callback.html?redirect=%2Fleaderboard%2F${SIGNUP_HASH()}`);
    await expect(page.getByRole('heading', { name: 'Your email is confirmed' })).toBeVisible();
    await expect
      .poll(() => calls.find('/functions/v1/email-wel-safe')?.postDataJSON() as unknown)
      .toMatchObject({ type: 'welcome' });
    expect(calls.find('/functions/v1/email-wel-safe')?.headers()['authorization']).toMatch(
      /^Bearer ey/,
    );
    // supabase-js took the tokens out of the address bar.
    expect(new URL(page.url()).hash).not.toContain('access_token');
    await page.waitForURL('**/leaderboard/', { timeout: 15_000 });
    expect(errors).toEqual([]);
    expect(violations).toEqual([]);
  });

  test('a recovery link on the callback page goes to the reset page with its hash', async ({
    page,
  }) => {
    const calls = await mockSupabase(page);
    const seen: string[] = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) seen.push(frame.url());
    });
    await page.goto(`/auth-callback.html${RECOVERY_HASH()}`);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    const arrival = seen.find(url => new URL(url).pathname === '/update-password.html');
    expect(arrival).toContain('#access_token=');
    expect(arrival).toContain('type=recovery');

    await page.getByRole('textbox', { name: 'New password', exact: true }).fill(STRONG);
    await page.getByRole('textbox', { name: 'Confirm password' }).fill(STRONG);
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByRole('heading', { name: 'Your password is changed' })).toBeVisible();
    const update = calls.requests.find(
      request => new URL(request.url()).pathname === '/auth/v1/user' && request.method() === 'PUT',
    );
    expect(update?.postDataJSON()).toMatchObject({ password: STRONG });
  });

  test('expired and missing links get a plain explanation and one next step', async ({ page }) => {
    await mockSupabase(page);
    await page.goto(`/auth-callback.html${EXPIRED_HASH}`);
    await expect(page.getByRole('heading', { name: 'This link did not work' })).toBeVisible();
    await expect(page.getByText(/expired or was already used/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/login/',
    );

    await page.goto(`/update-password.html${EXPIRED_HASH}`);
    await expect(page.getByRole('heading', { name: 'This reset link has expired' })).toBeVisible();

    await page.goto('/update-password.html');
    await expect(
      page.getByRole('heading', { name: 'Open the link from your email' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Send me a new link' })).toHaveAttribute(
      'href',
      '/forgot-password/',
    );
  });
});

/** Each screen in a state worth seeing; `ready` waits for it. */
const SCREENS: ReadonlyArray<{
  name: string;
  url: () => string;
  ready: (page: Page) => Promise<void>;
}> = [
  {
    name: 'login',
    url: () => '/login/',
    ready: page => expect(page.getByRole('tab', { name: 'Password' })).toBeVisible(),
  },
  {
    name: 'signup',
    url: () => '/signup/',
    ready: page => expect(page.getByRole('button', { name: 'Create account' })).toBeVisible(),
  },
  {
    name: 'forgot-password',
    url: () => '/forgot-password/',
    ready: page => expect(page.getByRole('button', { name: 'Send the reset link' })).toBeVisible(),
  },
  {
    name: 'update-password',
    url: () => `/update-password.html${RECOVERY_HASH()}`,
    ready: page =>
      expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible(),
  },
  {
    name: 'auth-callback-success',
    url: () => `/auth-callback.html?redirect=%2Fleaderboard%2F${SIGNUP_HASH()}`,
    ready: page =>
      expect(page.getByRole('heading', { name: 'Your email is confirmed' })).toBeVisible(),
  },
  {
    name: 'auth-callback-error',
    url: () => `/auth-callback.html${EXPIRED_HASH}`,
    ready: page =>
      expect(page.getByRole('heading', { name: 'This link did not work' })).toBeVisible(),
  },
];

/**
 * Opens a screen with no stored session. An earlier screen (the reset page) signs a session in, and
 * a link with tokens that finds another account signed in now asks before it switches.
 */
async function openScreen(page: Page, url: string) {
  try {
    await page.evaluate(() => window.localStorage.clear());
  } catch {
    // The first screen: no page yet, so nothing is stored.
  }
  await page.goto(url);
}

/**
 * The callback page moves on after four seconds. Holding the next page's request (never
 * answered) keeps the callback page on screen for axe and the screenshots.
 */
async function holdRedirect(page: Page) {
  await page.route('**/leaderboard/', () => {});
}

test.describe('accessibility, layout and screenshots', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`axe: no serious or critical violations, ${theme}`, async ({ page }) => {
      await mockSupabase(page);
      await holdRedirect(page);
      await storeTheme(page, theme);
      for (const screen of SCREENS) {
        await openScreen(page, screen.url());
        await screen.ready(page);
        expect(await blockingViolations(page), `${screen.name} ${theme}`).toEqual([]);
      }
    });
  }

  test('no horizontal overflow at 360 px, and 44 px targets', async ({ page }) => {
    await mockSupabase(page);
    await holdRedirect(page);
    await page.setViewportSize({ width: 360, height: 780 });
    // Targets first: the callback screen below signs the browser in, and a signed-in visitor
    // sees "You are signed in" on /login/ instead of the tabs.
    await page.goto('/login/');
    for (const name of ['Password', 'Email code']) {
      const box = await page.getByRole('tab', { name }).boundingBox();
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
    }
    const toggle = await page.getByRole('button', { name: 'Show password' }).boundingBox();
    expect(toggle?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(toggle?.width ?? 0).toBeGreaterThanOrEqual(44);
    for (const screen of SCREENS) {
      await openScreen(page, screen.url());
      await screen.ready(page);
      expect(await overflowing(page), screen.name).toEqual([]);
    }
  });

  test('the brand panel shows on wide screens and the static poster under reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/login/');
    const panel = page.getByRole('complementary', { name: 'About DualMind Arena' });
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Only one of them was useful.')).toBeVisible();
    await expect(panel.locator('[data-webgl]')).toHaveAttribute('data-webgl', 'static');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(panel).toBeHidden();
  });

  for (const theme of ['dark', 'light'] as const) {
    for (const viewport of [
      { label: 'desktop', width: 1440, height: 900 },
      { label: 'mobile', width: 390, height: 844 },
    ]) {
      test(`screenshots: ${viewport.label}, ${theme}`, async ({ page }) => {
        await mockSupabase(page);
        await holdRedirect(page);
        await storeTheme(page, theme);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        for (const screen of SCREENS) {
          await openScreen(page, screen.url());
          await screen.ready(page);
          await settle(page, 1200);
          await fullPageShot(page, {
            path: shotPath(`auth-${screen.name}-${viewport.label}-${theme}`),
            fullPage: viewport.label === 'mobile',
          });
        }
      });
    }
  }
});

// Cycle 2 audit P1-6: Google refuses sign-in inside in-app browsers, so say so up front.
test.describe('in-app browsers', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.1234',
  });

  test('/login/ warns that Google does not work there and keeps the other ways in', async ({
    page,
  }) => {
    await mockSupabase(page);
    await page.goto('/login/');
    const notice = page.getByTestId('in-app-browser-notice');
    await expect(notice).toContainText('Open this page in your browser to use Google');
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with GitHub/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Email code' })).toBeVisible();
  });
});

// Cycle 2 audit P1-5: the draft and the destination survive the OAuth round trip.
test('Continue with Google keeps the prompt draft and the destination in localStorage', async ({
  page,
}) => {
  await mockSupabase(page);
  await page.goto('/login/?redirect=%2Fcompare%2F');
  await page.evaluate(() =>
    window.sessionStorage.setItem(
      'dm.promptDraft.v1',
      JSON.stringify({ text: 'Kept across sign-in', savedAt: Date.now() }),
    ),
  );
  await page.getByRole('button', { name: /Continue with Google/ }).click();
  await page.waitForURL(`${SUPABASE}/auth/v1/authorize**`);
  // Back on the app's own origin, the record the sign-in page left is still there.
  await page.goto('/login/');
  const record = await page.evaluate(() => window.localStorage.getItem('dm.authHandoff.v1'));
  expect(JSON.parse(record ?? '{}')).toMatchObject({
    draft: 'Kept across sign-in',
    redirect: '/compare/',
  });
});
