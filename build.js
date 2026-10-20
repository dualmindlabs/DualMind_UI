// Composes dist/, the folder the dualmind-arena Worker serves (wrangler.jsonc: assets.directory).
//
// During the redesign (docs/redesign/migration-plan.md) old and new pages live side by side:
//   1. Build the React app in web/ (npm ci + react-router build) unless SKIP_WEB_BUILD=1, for
//      CI jobs that built it already. Cloudflare Workers Builds runs this script as it is, so the
//      root build stays self-contained.
//   2. Copy the legacy allowlist (the static Arena pages) into dist/.
//   3. Overlay web/build/client: new pages at their own paths, hashed files into dist/assets/
//      next to the legacy images, and React Router's SPA fallback as dist/__spa-fallback.html
//      (it is written as index.html while / is not prerendered, and must not replace the legacy
//      dist/index.html).
//   4. Write dist/__web-manifest.json for the Worker: the web app's pages, the sha256 hashes of
//      their inline scripts (the enforced Content-Security-Policy allows exactly these) and extra
//      connect-src origins (the Supabase project from VITE_SUPABASE_URL, once auth lands).
//   5. Check the result: every legacy file and every sitemap URL is in dist/, no web file
//      replaced a legacy one, and every hashed file matches the Worker's immutable-cache pattern.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = __dirname;
const distDir = path.join(__dirname, 'dist');
const webDir = path.join(__dirname, 'web');
const webClientDir = path.join(webDir, 'build', 'client');

// Define exactly what to copy to avoid the 100k+ files (like node_modules, next-dualmind, etc)
const filesToCopy = [
    'index.html',
    'auth-callback.html',
    'auth-verify.html',
    'config.js',
    'forgot-password.html',
    'login-modern.html',
    'manifest.json',
    'robots.txt',
    'signup-modern.html',
    'sitemap.xml',
    'theme.js',
    'update-password.html',
    '.assetsignore'
];

const foldersToCopy = [
    'about',
    'assets',
    'components',
    'cookies',
    'css',
    'faq',
    'how-it-works',
    'js',
    'leaderboard',
    'login',
    'models',
    'privacy',
    'share',
    'terms'
];

// Legacy files that a migrated route may replace. Empty until a slice moves an existing URL to
// the web app (for example 'index.html' when / is prerendered in slice S3).
const replacedByWeb = new Set([]);

// React Router writes its SPA fallback as index.html while / is not prerendered, and as
// __spa-fallback.html once it is. Either way it ends up here (served by server/routing.js).
const SPA_FALLBACK_FILE = '__spa-fallback.html';

// Same pattern as HASHED_ASSET_RE in server/routing.js (web/tests/worker checks they match).
const HASHED_ASSET_RE = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;

function fail(message) {
    console.error(`\nbuild.js: ${message}`);
    process.exit(1);
}

function run(command, cwd) {
    console.log(`\n> ${command}  (in ${path.relative(srcDir, cwd) || '.'})`);
    execSync(command, { cwd, stdio: 'inherit', env: process.env });
}

function listFiles(dir, base = dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFiles(full, base));
        } else {
            files.push(path.relative(base, full).split(path.sep).join('/'));
        }
    }
    return files;
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// 1. Build the web app.
if (process.env.SKIP_WEB_BUILD === '1') {
    console.log('SKIP_WEB_BUILD=1: using the existing web/build/client');
} else {
    // --include=dev: the build tools are devDependencies, and some hosts set NODE_ENV=production.
    run('npm ci --include=dev --no-audit --no-fund', webDir);
    run('npm run build', webDir);
}
if (!fs.existsSync(webClientDir)) {
    fail('web/build/client is missing. Build the web app first (npm run build in web/), or unset SKIP_WEB_BUILD.');
}

// 2. Copy the legacy allowlist.
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

for (const file of filesToCopy) {
    if (!fs.existsSync(path.join(srcDir, file))) {
        fail(`legacy file ${file} is in the allowlist but missing from the repository.`);
    }
    fs.copyFileSync(path.join(srcDir, file), path.join(distDir, file));
}

// The waitlist page (early.dualmindlab.tech) is its own app in waitlist-worker/, built and
// deployed from there; it is no longer copied from here.

for (const folder of foldersToCopy) {
    if (!fs.existsSync(path.join(srcDir, folder))) {
        fail(`legacy folder ${folder}/ is in the allowlist but missing from the repository.`);
    }
    copyDir(path.join(srcDir, folder), path.join(distDir, folder));
}

const legacyFiles = listFiles(distDir);
const legacySet = new Set(legacyFiles);

for (const file of legacyFiles) {
    if (HASHED_ASSET_RE.test(`/${file}`)) {
        fail(`legacy file ${file} looks like a hashed build file and would be cached for a year. Rename it.`);
    }
}

// 3. Overlay the web build.
// .vite/ holds Vite's build manifest: a build artefact, not something to serve.
const webFiles = listFiles(webClientDir).filter(file => !file.startsWith('.vite/'));
const hasOwnFallback = webFiles.includes(SPA_FALLBACK_FILE);
let spaFallbackSource = null;
const webHtmlTargets = [];

for (const file of webFiles) {
    let target = file;
    if (file === 'index.html' && !hasOwnFallback && !replacedByWeb.has('index.html')) {
        target = SPA_FALLBACK_FILE;
        spaFallbackSource = file;
    } else if (file === SPA_FALLBACK_FILE) {
        spaFallbackSource = file;
    }

    if (legacySet.has(target) && !replacedByWeb.has(target)) {
        fail(`web/build/client/${file} would replace the legacy dist/${target}. Add it to replacedByWeb once its slice migrates that URL.`);
    }
    if (target.startsWith('assets/') && !HASHED_ASSET_RE.test(`/${target}`)) {
        fail(`web/build/client/${file} has no content hash, so the Worker would not cache it. Check the Vite output names.`);
    }

    fs.mkdirSync(path.dirname(path.join(distDir, target)), { recursive: true });
    fs.copyFileSync(path.join(webClientDir, file), path.join(distDir, target));
    if (target.endsWith('.html')) {
        webHtmlTargets.push(target);
    }
}

if (!spaFallbackSource) {
    fail('the web build has no SPA fallback page (index.html or __spa-fallback.html).');
}

// 4. The web manifest (read by worker.js through server/web-manifest.js).
const WEB_MANIFEST_FILE = '__web-manifest.json';
if (legacySet.has(WEB_MANIFEST_FILE)) {
    fail(`${WEB_MANIFEST_FILE} is reserved for the web manifest.`);
}

// The URL a page is served at: design/index.html -> /design/, __spa-fallback.html -> /__spa-fallback.
function pageUrl(file) {
    if (file === 'index.html') return '/';
    if (file.endsWith('/index.html')) return `/${file.slice(0, -'index.html'.length)}`;
    return `/${file.slice(0, -'.html'.length)}`;
}

// Inline <script> elements (no src): the CSP allows each one by the sha256 of its exact text.
function inlineScriptHashes(html) {
    const hashes = [];
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        const [, attributes, content] = match;
        if (/\bsrc\s*=/i.test(attributes) || content.length === 0) continue;
        hashes.push(crypto.createHash('sha256').update(content, 'utf8').digest('base64'));
    }
    return hashes;
}

// The Supabase project the web app talks to, from the build environment (slice S6 sets it).
function connectSrcFromEnv() {
    const raw = (process.env.VITE_SUPABASE_URL || '').trim();
    if (!raw) return [];
    let url;
    try {
        url = new URL(raw);
    } catch {
        fail(`VITE_SUPABASE_URL is not a URL: ${raw}`);
    }
    if (url.protocol !== 'https:') {
        fail(`VITE_SUPABASE_URL must use https: ${raw}`);
    }
    return [url.origin, `wss://${url.host}`];
}

const scriptHashes = new Set();
for (const target of webHtmlTargets) {
    for (const hash of inlineScriptHashes(fs.readFileSync(path.join(distDir, target), 'utf8'))) {
        scriptHashes.add(hash);
    }
}
const webManifest = {
    version: 1,
    pages: webHtmlTargets.map(pageUrl).sort(),
    scriptHashes: [...scriptHashes].sort(),
    connectSrc: connectSrcFromEnv(),
};
fs.writeFileSync(path.join(distDir, WEB_MANIFEST_FILE), `${JSON.stringify(webManifest, null, 2)}\n`);

// 5. Check the composed output.
for (const file of legacyFiles) {
    if (!fs.existsSync(path.join(distDir, file))) {
        fail(`legacy file ${file} is missing from dist/.`);
    }
}

function pagePath(urlPath) {
    const clean = decodeURIComponent(urlPath.replace(/^\//, ''));
    if (clean === '' || clean.endsWith('/')) return `${clean}index.html`;
    return clean;
}

const sitemapUrls = [];
const sitemap = fs.readFileSync(path.join(distDir, 'sitemap.xml'), 'utf8');
for (const match of sitemap.matchAll(/<loc>\s*https?:\/\/[^/<]+(\/[^<\s]*)\s*<\/loc>/g)) {
    sitemapUrls.push(match[1]);
}
// worker.js answers /sitemap.xml itself; check its URLs too.
const workerSource = fs.readFileSync(path.join(srcDir, 'worker.js'), 'utf8');
for (const match of workerSource.matchAll(/<loc>https:\/\/\$\{domain\}(\/[^<]*)<\/loc>/g)) {
    sitemapUrls.push(match[1]);
}
if (sitemapUrls.length === 0) {
    fail('found no URLs in sitemap.xml or worker.js; the sitemap check would prove nothing.');
}
for (const urlPath of new Set(sitemapUrls)) {
    if (!fs.existsSync(path.join(distDir, pagePath(urlPath)))) {
        fail(`sitemap URL ${urlPath} has no page in dist/ (expected dist/${pagePath(urlPath)}).`);
    }
}

const webPages = webFiles.filter(file => file.endsWith('.html')).length;
console.log(`\nFrontend built to /dist successfully: ${legacyFiles.length} legacy files, ${webFiles.length} web files (${webPages} HTML), SPA fallback from web/build/client/${spaFallbackSource} at dist/${SPA_FALLBACK_FILE}.`);
console.log(`Web manifest: ${webManifest.pages.join(', ')}; ${webManifest.scriptHashes.length} inline script hashes for the CSP; connect-src extras: ${webManifest.connectSrc.join(' ') || 'none'}.`);
