import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against the COMPOSED site: ../dist (legacy files + this app, built by
 * `node build.js` at the repo root) served through the real ../worker.js by `wrangler dev`
 * (tests/e2e/serve-dist.mjs). Run `node build.js` at the repo root first.
 *
 * Screenshots land in ./screenshots (uploaded by CI as the `web-screenshots` artifact).
 */
const PORT = Number(process.env.WEB_E2E_PORT ?? 8787);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `node tests/e2e/serve-dist.mjs --port ${PORT}`,
    // The preview code passes the waitlist gate, so this answers 200 once the Worker is up.
    url: `http://127.0.0.1:${PORT}/design/?preview=dualmind-preview`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
