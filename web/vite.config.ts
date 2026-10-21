import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    // The `@/...` alias (-> src/), from tsconfig.json `paths`.
    tsconfigPaths: true,
  },
  build: {
    // PERF_PROBE=1 (a throwaway CI job): source maps list the modules inside every chunk.
    sourcemap: process.env.PERF_PROBE === '1',
    // Every file is emitted as /assets/<name>-<hash>.<ext> (fonts included), so the Worker can
    // cache all of them as immutable and a future CSP can keep `font-src 'self'` without data: URIs.
    assetsInlineLimit: 0,
  },
});
