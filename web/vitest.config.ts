import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Two projects: unit tests of the app (tests/unit, jsdom) and tests of the Worker
// (tests/worker, Node, importing ../worker.js). The React Router Vite plugin is not used here:
// it is meant for app builds, not for Vitest.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // contract/ lives outside web/ and has no node_modules: its `zod` import resolves to ours.
    alias: [
      {
        find: /^zod$/,
        replacement: fileURLToPath(new URL('./node_modules/zod', import.meta.url)),
      },
    ],
    tsconfigPaths: true,
  },
  test: {
    restoreMocks: true,
    unstubGlobals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
          environment: 'jsdom',
          setupFiles: ['tests/unit/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'worker',
          include: ['tests/worker/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
