// Composes dist/, the folder the dualmind-arena Worker serves (wrangler.jsonc: assets.directory).
//
// During the redesign (docs/redesign/migration-plan.md) old and new pages live side by side:
//   1. Build the React app in web/ (npm ci + react-router build) unless SKIP_WEB_BUILD=1, for
//      CI jobs that built it already. Cloudflare Workers Builds runs this script as it is, so the
//      root build stays self-contained.
//   2. Copy the legacy allowlist (the static Arena pages) into dist/.
//   3. Overlay web/build/client: new pages at their own paths, hashed files into dist/assets/
//      next to the legacy images, and React Router's SPA fallback as dist/__spa-fallback.html.
//      Since slice S3 the landing page is prerendered at /, so the web app's index.html replaces
//      the legacy one; the legacy arena keeps working as dist/legacy-app.html (see LEGACY_APP_FILE).
//   4. Write dist/__web-manifest.json for the Worker: the web app's pages, the sha256 hashes of
//      their inline scripts (the enforced Content-Security-Policy allows exactly these) and extra
//      connect-src origins (the Supabase project from VITE_SUPABASE_URL, once auth lands).
//   5. Write dist/sitemap.xml and dist/robots.txt from the pages above (the public ones only).
//   6. Check the result: every legacy file and every sitemap URL is in dist/, no web file
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
// Slice S6 dropped the legacy sign-in pages: login-modern.html, signup-modern.html and
// forgot-password.html (and the login/ folder) answer with 301s to the web app's /login/,
// /signup/ and /forgot-password/ (server/redirects.js); auth-callback.html and
// update-password.html are the web app's client-only routes (server/routing.js).
const filesToCopy = [
    'index.html',
    'auth-verify.html',
    'config.js',
    'manifest.json',
    'theme.js',
    '.assetsignore'
];

const foldersToCopy = [
    'assets',
    'components',
    'css',
    'js',
    'leaderboard',
    'models',
    'share'
];

// Public pages that are still legacy files (no web page yet): they go into the sitemap next to
// the web app's indexable pages. A slice that migrates one drops it from this list.
const LEGACY_PUBLIC_PAGES = ['/'];

// The public origin, for sitemap.xml and robots.txt (the same variable the web app's canonical
// URLs use, with the same default).
const SITE_URL = (process.env.VITE_SITE_URL || 'https://arena.dualmindlab.tech').trim().replace(/\/+$/, '');

// React Router prerenders the 404 route (the splat route, listed as /404) to 404/index.html.
// The Worker serves it as dist/404.html with status 404, so it is moved to that name.
const NOT_FOUND_SOURCE = '404/index.html';
const NOT_FOUND_TARGET = '404.html';


// Legacy files that a migrated route replaces: the web build's page is copied over the legacy
// one. The legacy files stay in the repository until the cutover (S13).
const replacedByWeb = new Set([
    // Slice S3: the landing page is prerendered at /.
    'index.html',
    // Slice S7: the live leaderboard and the model directory.
    'leaderboard/index.html',
    'models/index.html',
]);

// While the arena is still the legacy app (until slice S8), its page lives on as a copy of the
// legacy index.html at the ROOT of dist/, so its relative paths (./config.js, js/..., css/...)
// still resolve. The landing page's inline hand-off script (web/src/lib/session/handoff.ts) sends
// signed-in visitors and Supabase auth returns there, query string and hash included.
const LEGACY_APP_FILE = 'legacy-app.html';

// React Router writes its SPA fallback as __spa-fallback.html when / is prerendered (it would be
// index.html otherwise). It ends up here either way (served by server/routing.js).
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

// 0. Sign-in settings for the web build. Production and preview builds should get
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from the Workers Builds build variables. Until those
// are set, the public URL and anon key are read here from the legacy config.js (public by design,
// already served to every browser) and passed to the web build through the environment, so no new
// file holds them. Replace this fallback with the build variables before config.js is deleted at
// the cutover (slice S13).
function supabaseSettingsFromLegacyConfig() {
    const file = path.join(srcDir, 'config.js');
    if (!fs.existsSync(file)) return null;
    const source = fs.readFileSync(file, 'utf8');
    const read = name => new RegExp(`const ${name}\\s*=[^;]*?:\\s*'([^']+)'\\s*;`).exec(source)?.[1];
    const url = read('envSupabaseUrl');
    const anonKey = read('envSupabaseAnonKey');
    if (!url || !anonKey || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) return null;
    return { url, anonKey };
}

if (!process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_ANON_KEY) {
    const legacy = supabaseSettingsFromLegacyConfig();
    if (legacy) {
        process.env.VITE_SUPABASE_URL = legacy.url;
        process.env.VITE_SUPABASE_ANON_KEY = legacy.anonKey;
        console.log(`Sign-in: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set; using the public values from config.js (${legacy.url}). Set the build variables before config.js is removed (S13).`);
    }
} else if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    console.warn('build.js: set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or neither; sign-in will be unavailable.');
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

if (fs.existsSync(path.join(srcDir, LEGACY_APP_FILE))) {
    fail(`${LEGACY_APP_FILE} is written by build.js from index.html; remove the file from the repository root.`);
}
fs.copyFileSync(path.join(srcDir, 'index.html'), path.join(distDir, LEGACY_APP_FILE));

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
const replacedLegacyFiles = new Set();

for (const file of webFiles) {
    let target = file;
    if (file === NOT_FOUND_SOURCE) {
        target = NOT_FOUND_TARGET;
    } else if (file === 'index.html' && !hasOwnFallback && !replacedByWeb.has('index.html')) {
        target = SPA_FALLBACK_FILE;
        spaFallbackSource = file;
    } else if (file === SPA_FALLBACK_FILE) {
        spaFallbackSource = file;
    }

    if (legacySet.has(target) && !replacedByWeb.has(target)) {
        fail(`web/build/client/${file} would replace the legacy dist/${target}. Add it to replacedByWeb once its slice migrates that URL.`);
    }
    if (legacySet.has(target)) {
        replacedLegacyFiles.add(target);
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
for (const file of replacedByWeb) {
    if (!replacedLegacyFiles.has(file)) {
        fail(`replacedByWeb lists ${file}, but the web build did not write it. Prerender its route or drop it from the list.`);
    }
}
if (fs.readFileSync(path.join(distDir, 'index.html'), 'utf8').includes('data-spa-fallback')) {
    fail('dist/index.html is the SPA fallback, not the prerendered landing page. Check the prerender list in web/react-router.config.ts.');
}
if (!webFiles.includes(NOT_FOUND_SOURCE)) {
    fail(`the web build has no 404 page (${NOT_FOUND_SOURCE}). Check that /404 is in prerender in web/react-router.config.ts.`);
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

// Origins the web app's pages may fetch from besides their own: the Supabase project from the
// build environment (VITE_SUPABASE_URL, a Workers Builds build variable; never hard-coded here)
// and the Pwned Passwords range API for the sign-up breach check (k-anonymity: only five
// characters of a SHA-1 hash leave the browser).
const PWNED_PASSWORDS_ORIGIN = 'https://api.pwnedpasswords.com';

function connectSrcFromEnv() {
    const raw = (process.env.VITE_SUPABASE_URL || '').trim();
    if (!raw) {
        console.warn('build.js: VITE_SUPABASE_URL is not set; the sign-in pages will show "sign-in unavailable".');
        return [PWNED_PASSWORDS_ORIGIN];
    }
    let url;
    try {
        url = new URL(raw);
    } catch {
        fail(`VITE_SUPABASE_URL is not a URL: ${raw}`);
    }
    if (url.protocol !== 'https:') {
        fail(`VITE_SUPABASE_URL must use https: ${raw}`);
    }
    return [url.origin, `wss://${url.host}`, PWNED_PASSWORDS_ORIGIN];
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

// 5. sitemap.xml and robots.txt, generated from the pages in dist/ (the Worker serves these
// files as they are). A web page is listed unless its robots meta says noindex; the SPA fallback
// and the 404 page never are.
function isIndexable(html) {
    for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
        if (/\bname\s*=\s*["']robots["']/i.test(tag[0]) && /noindex/i.test(tag[0])) return false;
    }
    return true;
}

const sitemapPages = [];
for (const target of webHtmlTargets) {
    const url = pageUrl(target);
    if (url === '/__spa-fallback' || url === '/404') continue;
    if (isIndexable(fs.readFileSync(path.join(distDir, target), 'utf8'))) sitemapPages.push(url);
}
for (const url of LEGACY_PUBLIC_PAGES) {
    if (fs.existsSync(path.join(distDir, url === '/' ? 'index.html' : `${url.slice(1)}index.html`))) {
        sitemapPages.push(url);
    }
}
sitemapPages.sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...new Set(sitemapPages)].map(url => `  <url><loc>${SITE_URL}${url}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml);
fs.writeFileSync(
    path.join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
);

// 6. Check the composed output.
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

const sitemapUrls = [...new Set(sitemapPages)];
if (sitemapUrls.length === 0) {
    fail('the sitemap has no URLs; the sitemap check would prove nothing.');
}
for (const urlPath of sitemapUrls) {
    if (!fs.existsSync(path.join(distDir, pagePath(urlPath)))) {
        fail(`sitemap URL ${urlPath} has no page in dist/ (expected dist/${pagePath(urlPath)}).`);
    }
}

const webPages = webFiles.filter(file => file.endsWith('.html')).length;
console.log(`\nFrontend built to /dist successfully: ${legacyFiles.length} legacy files, ${webFiles.length} web files (${webPages} HTML), SPA fallback from web/build/client/${spaFallbackSource} at dist/${SPA_FALLBACK_FILE}, legacy arena at dist/${LEGACY_APP_FILE}, replaced by the web app: ${[...replacedLegacyFiles].join(', ') || 'none'}.`);
console.log(`Web manifest: ${webManifest.pages.join(', ')}; ${webManifest.scriptHashes.length} inline script hashes for the CSP; connect-src extras: ${webManifest.connectSrc.join(' ') || 'none'}.`);
