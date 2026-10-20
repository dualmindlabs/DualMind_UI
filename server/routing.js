// Routing helpers for the Arena Worker (worker.js), kept in their own module so they can be
// unit-tested (web/tests/worker/) without exporting anything extra from the Worker entry.

/**
 * Files emitted by the web app's Vite build: /assets/<name>-<hash>.<ext>, where the 8-character
 * hash changes whenever the content does. Browsers may keep them for a year. Legacy files in
 * assets/ (logo.png, background.png...) have no hash and keep their old headers.
 * build.js uses the same pattern to check both sides; keep the two in sync (a test does).
 */
export const HASHED_ASSET_RE = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/;

/** @param {string} pathname */
export function isHashedAsset(pathname) {
  return HASHED_ASSET_RE.test(pathname);
}

/**
 * Client-only routes of the web app, answered with React Router's SPA fallback page
 * (dist/__spa-fallback.html, written by build.js) and status 200. Each entry is an exact path,
 * or a prefix ending in `*` (`/share/*`). Empty until the first client-only route lands
 * (slice S5 onwards: /share/, /settings/, /auth-callback.html, /update-password.html).
 * @type {readonly string[]}
 */
export const SPA_FALLBACK_ROUTES = [];

/** Where the fallback is served from. Workers assets serve dist/__spa-fallback.html here. */
export const SPA_FALLBACK_PATH = '/__spa-fallback';

/**
 * @param {string} pathname
 * @param {readonly string[]} [routes]
 */
export function isSpaFallbackRoute(pathname, routes = SPA_FALLBACK_ROUTES) {
  return routes.some(route =>
    route.endsWith('*') ? pathname.startsWith(route.slice(0, -1)) : pathname === route,
  );
}

/**
 * The SPA fallback page with status 200, or null when it is missing from the assets.
 * @param {Request} request
 * @param {{ ASSETS?: { fetch: (request: Request) => Promise<Response> } }} env
 * @returns {Promise<Response | null>}
 */
export async function serveSpaFallback(request, env) {
  if (!env?.ASSETS?.fetch) return null;
  const url = new URL(request.url);
  url.pathname = SPA_FALLBACK_PATH;
  url.search = '';
  const asset = await env.ASSETS.fetch(new Request(url, { method: 'GET', headers: request.headers }));
  if (!asset || asset.status !== 200) return null;

  // Security headers and the CSP are added by worker.js for every response.
  const response = new Response(asset.body, { status: 200, headers: asset.headers });
  response.headers.set('content-type', 'text/html; charset=utf-8');
  response.headers.set('cache-control', 'no-cache');
  return response;
}

/**
 * Pages that must stay out of search results: the style guide and the SPA fallback itself.
 * @param {string} pathname
 */
export function isNoindexPath(pathname) {
  return (
    pathname === '/design' ||
    pathname.startsWith('/design/') ||
    pathname === SPA_FALLBACK_PATH ||
    pathname === `${SPA_FALLBACK_PATH}.html`
  );
}
