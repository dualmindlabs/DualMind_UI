import { defineConfig, devices } from '@playwright/test';

/**
 * Review screenshots for the redesign slices (tests/shots): the same pages, at desktop 1440 and
 * phone 390, in dark and light, against the COMPOSED site (../dist served by the real Worker).
 * The redesign-shots workflow runs this on the base branch ("before") and on the PR ("after").
 * Screenshots land in ./shots-out.
 */
const PORT = Number(process.env.WEB_E2E_PORT ?? 8787);

export default defineConfig({
  testDir: './tests/shots',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node tests/e2e/serve-dist.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/design/?preview=dualmind-preview`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
