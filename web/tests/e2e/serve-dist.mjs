// Serves the composed ../dist through the real ../worker.js with `wrangler dev` (local workerd),
// for the Playwright tests. Usage: node tests/e2e/serve-dist.mjs [--port 8787]
//
// The root wrangler.jsonc carries production-only settings that local dev does not need: the
// arena.dualmindlab.tech route and the Flagship binding. This writes a copy without them to
// tests/.tmp/wrangler.e2e.json; everything else (main, assets, run_worker_first, compatibility
// date) is taken from the real config, so the tests exercise the deployed setup.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '../..');
const repoRoot = path.resolve(webDir, '..');
const portFlag = process.argv.indexOf('--port');
const port = portFlag > -1 ? process.argv[portFlag + 1] : '8787';

/** JSONC to JSON: drops // and block comments outside strings, and trailing commas. */
function stripJsonc(text) {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inString) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        i += 1;
      } else if (char === '"') {
        inString = false;
      }
    } else if (char === '"') {
      inString = true;
      out += char;
    } else if (char === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out += '\n';
    } else if (char === '/' && next === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i += 1;
      i += 1;
    } else {
      out += char;
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

const config = JSON.parse(stripJsonc(readFileSync(path.join(repoRoot, 'wrangler.jsonc'), 'utf8')));
delete config.routes;
delete config.flagship;
delete config.observability;
config.main = path.join(repoRoot, config.main);
config.assets = { ...config.assets, directory: path.join(repoRoot, config.assets.directory) };

if (!existsSync(path.join(config.assets.directory, 'design', 'index.html'))) {
  console.error(
    'serve-dist: dist/design/index.html is missing. Run `node build.js` at the repo root first.',
  );
  process.exit(1);
}

const tmpDir = path.join(webDir, 'tests', '.tmp');
mkdirSync(tmpDir, { recursive: true });
const configPath = path.join(tmpDir, 'wrangler.e2e.json');
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

const wrangler = path.join(webDir, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const child = spawn(
  process.execPath,
  [
    wrangler,
    'dev',
    '--config',
    configPath,
    '--port',
    String(port),
    '--ip',
    '127.0.0.1',
    '--persist-to',
    path.join(tmpDir, 'state'),
  ],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', code => process.exit(code ?? 0));
