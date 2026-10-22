import { defineConfig, devices } from '@playwright/test';

/**
 * The hard UI pass (tests/hardtest). Two targets:
 *   composed (default): ../dist served by the real Worker through tests/e2e/serve-dist.mjs.
 *   live: HARD_BASE_URL=https://arena.dualmindlab.tech (the preview cookie is set per test);
 *         only the public routes run there, nothing is mocked.
 * Screenshots land in ./hardtest-out/shots, findings in ./hardtest-out/results.
 */
const PORT = Number(process.env.WEB_E2E_PORT ?? 8787);
const EXTERNAL = process.env.HARD_BASE_URL;

export default defineConfig({
  testDir: './tests/hardtest',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'hardtest-out/playwright.json' }]],
  use: {
    baseURL: EXTERNAL ?? `http://127.0.0.1:${PORT}`,
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: EXTERNAL
    ? undefined
    : {
        command: `node tests/e2e/serve-dist.mjs --port ${PORT}`,
        url: `http://127.0.0.1:${PORT}/design/?preview=dualmind-preview`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
