// The Workers project: tests that run inside workerd (Miniflare) against the real worker.js and
// server/v2/. The Node tests of the JS modules stay in web/ (web/tests/worker). Run from the repo
// root after `node scripts/link-worker-deps.mjs --all`: npm run api:test.
import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: './tests/api/wrangler.test.jsonc' } })],
  test: {
    include: ['tests/api/**/*.test.ts'],
    restoreMocks: true,
  },
});
