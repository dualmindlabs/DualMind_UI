// The Worker (worker.js, server/, contract/) is bundled by wrangler from the repo root, but its
// dependencies are declared in web/package.json (the only lockfile CI and Workers Builds resolve
// with `npm ci`). This links them into ./node_modules so the bundler, Node scripts and the Workers
// Vitest project find them. Existing entries are never replaced.
//   node scripts/link-worker-deps.mjs          the runtime packages of the Worker
//   node scripts/link-worker-deps.mjs --all    everything in web/node_modules (CI test jobs)
import { existsSync, lstatSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'web', 'node_modules');
const target = path.join(root, 'node_modules');
const RUNTIME = ['hono', '@hono', 'jose', 'zod'];

if (!existsSync(source)) {
  console.error('web/node_modules is missing. Run `npm ci` in web/ first.');
  process.exit(1);
}

const names = process.argv.includes('--all')
  ? readdirSync(source).filter(name => name !== '.bin' && !name.startsWith('.'))
  : RUNTIME.filter(name => existsSync(path.join(source, name)));

mkdirSync(target, { recursive: true });
for (const name of new Set(names)) {
  const link = path.join(target, name);
  let present = false;
  try {
    lstatSync(link);
    present = true;
  } catch {
    // not there yet
  }
  if (present) continue;
  symlinkSync(path.join(source, name), link, 'dir');
  console.log(`linked node_modules/${name}`);
}
if (process.argv.includes('--all') && !existsSync(path.join(target, '.bin')) && existsSync(path.join(source, '.bin'))) {
  symlinkSync(path.join(source, '.bin'), path.join(target, '.bin'), 'dir');
}
