import { fileURLToPath } from 'node:url';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    // contract/ lives outside web/ and has no node_modules: its `zod` import resolves to ours.
    alias: [
      {
        find: /^zod$/,
        replacement: fileURLToPath(new URL('./node_modules/zod', import.meta.url)),
      },
    ],
    // The `@/...` alias (-> src/), from tsconfig.json `paths`.
    tsconfigPaths: true,
  },
  build: {
    // Every file is emitted as /assets/<name>-<hash>.<ext> (fonts included), so the Worker can
    // cache all of them as immutable and a future CSP can keep `font-src 'self'` without data: URIs.
    assetsInlineLimit: 0,
  },
});
