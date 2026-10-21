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
 * or a prefix ending in `*` (`/share/*`).
 * @type {readonly string[]}
 */
export const SPA_FALLBACK_ROUTES = [
  // Slice S6: the Supabase email targets, rendered in place at their exact legacy addresses
  // (links already in inboxes point here), never redirected.
  '/update-password.html',
  '/auth-callback.html',
  // Slice S11: share links, /share/<id> and the old /share/?id=<id> forms (server/share.js adds
  // no-store and the link-preview tags).
  '/share',
  '/share/*',
  // Slice S12: the signed-in settings page (the page sends signed-out visitors to /login/).
  // Never indexed (isNoindexPath).
  '/settings',
  '/settings/',
];

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
  if (isNoindexPath(new URL(request.url).pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

/**
 * Pages that must stay out of search results: the style guide, the SPA fallback itself and the
 * signed-in settings page.
 * @param {string} pathname
 */
export function isNoindexPath(pathname) {
  return (
    pathname === NOT_FOUND_PAGE ||
    pathname === '/design' ||
    pathname.startsWith('/design/') ||
    pathname === '/settings' ||
    pathname === '/settings/' ||
    pathname === SPA_FALLBACK_PATH ||
    pathname === `${SPA_FALLBACK_PATH}.html`
  );
}

/** The 404 page's entry in the web manifest (build.js lists dist/404.html as /404). */
export const NOT_FOUND_PAGE = '/404';

/**
 * The web app's 404 page (dist/404.html, prerendered from the splat route) with status 404, or
 * null when it is missing from the assets (the Worker then answers with plain text). It is
 * requested as `/404`, the clean URL Workers static assets serve it under; the caller's
 * conditional headers are not forwarded, so a 304 can never turn into an empty 404.
 * @param {Request} request
 * @param {{ ASSETS?: { fetch: (request: Request) => Promise<Response> } }} env
 * @returns {Promise<Response | null>}
 */
export async function serveNotFoundPage(request, env) {
  if (!env?.ASSETS?.fetch) return null;
  for (const candidate of [NOT_FOUND_PAGE, `${NOT_FOUND_PAGE}.html`]) {
    const url = new URL(request.url);
    url.pathname = candidate;
    url.search = '';
    let asset;
    try {
      asset = await env.ASSETS.fetch(new Request(url));
    } catch (error) {
      console.error('Failed to load the 404 page:', error);
      return null;
    }
    if (asset && asset.status === 200) {
      const response = new Response(asset.body, {
        status: 404,
        statusText: 'Not Found',
        headers: asset.headers,
      });
      response.headers.set('content-type', 'text/html; charset=utf-8');
      response.headers.set('cache-control', 'no-cache');
      response.headers.set('X-Robots-Tag', 'noindex');
      response.headers.delete('etag');
      return response;
    }
  }
  return null;
}
