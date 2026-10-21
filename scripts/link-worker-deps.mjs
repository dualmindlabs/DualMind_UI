// The Worker (worker.js, server/, contract/) is bundled by wrangler from the repo root, but its
// dependencies are declared in web/package.json (the only lockfile CI and Workers Builds resolve
// with `npm ci`). This puts them where the bundler, Node scripts and the Workers Vitest project
// look: ./node_modules. Existing entries are never replaced.
//   node scripts/link-worker-deps.mjs          COPIES the runtime packages of the Worker and their
//                                              dependencies (what build.js runs; Workers Builds
//                                              fails the build when node_modules holds symlinks
//                                              into web/, so these are real copies)
//   node scripts/link-worker-deps.mjs --all    symlinks everything in web/node_modules (CI test jobs)
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'web', 'node_modules');
const target = path.join(root, 'node_modules');
const ROOTS = ['hono', '@hono/zod-openapi', 'jose', 'zod'];

if (!existsSync(source)) {
  console.error('web/node_modules is missing. Run `npm ci` in web/ first.');
  process.exit(1);
}

function present(file) {
  try {
    lstatSync(file);
    return true;
  } catch {
    return false;
  }
}

/** Package names reachable from ROOTS through dependencies and peerDependencies (flat npm layout). */
function closure() {
  const seen = new Set();
  const queue = [...ROOTS];
  while (queue.length > 0) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    const manifest = path.join(source, name, 'package.json');
    if (!existsSync(manifest)) continue;
    seen.add(name);
    const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
    queue.push(...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {}));
  }
  return [...seen].sort();
}

mkdirSync(target, { recursive: true });

if (process.argv.includes('--all')) {
  for (const name of readdirSync(source).filter(entry => !entry.startsWith('.') || entry === '.bin')) {
    const link = path.join(target, name);
    if (present(link)) continue;
    symlinkSync(path.join(source, name), link, 'dir');
    console.log(`linked node_modules/${name}`);
  }
} else {
  for (const name of closure()) {
    const destination = path.join(target, name);
    if (present(destination)) continue;
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(source, name), destination, { recursive: true, dereference: true });
    console.log(`copied node_modules/${name}`);
  }
}
