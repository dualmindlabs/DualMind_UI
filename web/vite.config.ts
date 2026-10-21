import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { writeFileSync } from 'node:fs';

import { defineConfig, type Plugin } from 'vite';

// PERF_PROBE=1 (a throwaway CI job): writes the modules inside every chunk to build/probe.json.
const probe: Plugin = {
  name: 'perf-probe',
  generateBundle(_options, bundle) {
    const out: Record<string, string[]> = {};
    for (const [name, chunk] of Object.entries(bundle))
      if (chunk.type === 'chunk') out[name] = Object.keys(chunk.modules);
    writeFileSync('probe.json', JSON.stringify(out));
  },
};

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), ...(process.env.PERF_PROBE === '1' ? [probe] : [])],
  resolve: {
    // The `@/...` alias (-> src/), from tsconfig.json `paths`.
    tsconfigPaths: true,
  },
  build: {
    // Every file is emitted as /assets/<name>-<hash>.<ext> (fonts included), so the Worker can
    // cache all of them as immutable and a future CSP can keep `font-src 'self'` without data: URIs.
    assetsInlineLimit: 0,
  },
});
