// Renders the page to static HTML after `vite build`, so the first paint shows the real
// layout and copy instead of an empty <div id="root">. The client then hydrates it.
// Usage: node scripts/prerender.mjs [outDir]   (default: dist)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.resolve(root, process.argv[2] ?? 'dist');
const htmlPath = path.join(outDir, 'index.html');

const { render } = await import(pathToFileURL(path.join(root, '.ssr', 'entry-server.js')).href);
const template = await readFile(htmlPath, 'utf8');
const marker = '<!--app-html-->';
if (!template.includes(marker)) {
  throw new Error(`${htmlPath} has no ${marker} placeholder; was it prerendered already?`);
}
const html = template.replace(marker, render());
await writeFile(htmlPath, html);
console.log(`Prerendered ${path.relative(root, htmlPath)} (${(html.length / 1024).toFixed(1)} KiB)`);
