// ---------------------------------------------------------------------------
// Pre-launch: every Arena visitor goes to the waitlist, until the Arena is rebuilt.
//
// While FORCE_WAITLIST is true, EVERY request to this worker (all paths, including /,
// /leaderboard/ and /api/*, and all methods) gets a temporary 302 redirect to
// https://early.dualmindlab.tech/?ref=arena. The query string is kept, `preview` is dropped, and
// `ref=arena` is added unless the link already has a `ref`. It is a 302, not a 301, so browsers
// and search engines don't remember it and switching it off works at once.
//
// wrangler.jsonc sets `assets.run_worker_first: true` so that requests for real files such as
// / and /leaderboard/ reach this code too; without it, Cloudflare serves those files directly.
//
// To switch the redirect off: set FORCE_WAITLIST to false and merge to master (Workers Builds
// deploys it). The Arena then works as before; run_worker_first can stay on, because
// serveArena() serves the static files itself.
//
// Preview bypass, for showing the Arena while it is closed:
//   https://arena.dualmindlab.tech/?preview=dualmind-preview   sets a `dm_preview` cookie (30 days)
//   https://arena.dualmindlab.tech/?preview=off                clears it
// Requests that carry the cookie skip the redirect. The code is not a secret: nothing sensitive
// is behind it, it only keeps ordinary visitors on the waitlist.
// ---------------------------------------------------------------------------
//
// After the gate, requests go through, in order (docs/architecture.md, "Worker request flow"):
//   1. /api/*: the same-origin proxy to the DualMind API (server/api-proxy.js)
//   2. legacy URL redirects, 301 (server/redirects.js)
//   3. client-only routes of the web app: the SPA fallback page (server/routing.js); the share
//      page /share/<id> gets it never cached and with link-preview tags (server/share.js)
//   4. og-image.png
//   5. static files from dist/ (robots.txt and sitemap.xml are built into it by build.js) with
//      the caching table (server/caching.js)
//   6. anything else: the 404 page (dist/404.html) with status 404
// and every response leaves with the security headers and, for HTML, the Content-Security-Policy
// (server/security-headers.js, with the CSP hashes from dist/__web-manifest.json).
// ---------------------------------------------------------------------------
import { proxyApi } from './server/api-proxy.js';
import { problemTypeUrl } from './server/problem-types.js';
import { checkRateLimit } from './server/rate-limit.js';
import { sanitizeRequestId } from './server/request-id.js';
import { cacheControlFor } from './server/caching.js';
import { redirectResponse } from './server/redirects.js';
import {
  isNoindexPath,
  isSpaFallbackRoute,
  NOT_FOUND_PAGE,
  serveNotFoundPage,
  serveSpaFallback,
  SPA_FALLBACK_PATH,
} from './server/routing.js';
import {
  applySecurityHeaders,
  LEGACY_CONTENT_SECURITY_POLICY,
  webContentSecurityPolicy,
} from './server/security-headers.js';
import { isShareRoute, serveSharePage } from './server/share.js';
import { loadWebManifest } from './server/web-manifest.js';

const FORCE_WAITLIST = true;
const WAITLIST_URL = 'https://early.dualmindlab.tech/';
const PREVIEW_CODE = 'dualmind-preview';
const PREVIEW_COOKIE = 'dm_preview';
const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds
const PREVIEW_COOKIE_ATTRIBUTES = 'Path=/; Secure; HttpOnly; SameSite=Lax';

export default {
  async fetch(request, env, ctx) {
    const response = await handleRequest(request, env, ctx);
    return withSecurityHeaders(request, env, response);
  },
};

// The pre-launch gate (see the comment at the top).
async function handleRequest(request, env, ctx) {
  if (!FORCE_WAITLIST) {
    return serveArena(request, env, ctx);
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get('preview');

  if (preview === 'off') {
    return waitlistRedirect(url, `${PREVIEW_COOKIE}=; Max-Age=0; ${PREVIEW_COOKIE_ATTRIBUTES}`);
  }

  if (preview === PREVIEW_CODE) {
    const response = await serveArena(request, env, ctx);
    const withCookie = new Response(response.body, response);
    withCookie.headers.append('Set-Cookie', `${PREVIEW_COOKIE}=1; Max-Age=${PREVIEW_MAX_AGE}; ${PREVIEW_COOKIE_ATTRIBUTES}`);
    withCookie.headers.set('Cache-Control', 'private, no-store');
    return withCookie;
  }

  if (hasPreviewCookie(request)) {
    return serveArena(request, env, ctx);
  }

  return waitlistRedirect(url);
}

function hasPreviewCookie(request) {
  const cookies = request.headers.get('Cookie') || '';
  return cookies.split(';').some(part => part.trim() === `${PREVIEW_COOKIE}=1`);
}

function waitlistRedirect(url, setCookie) {
  const target = new URL(WAITLIST_URL);
  target.search = url.search;
  target.searchParams.delete('preview');
  if (!target.searchParams.has('ref')) {
    target.searchParams.set('ref', 'arena');
  }
  const headers = new Headers({ Location: target.toString(), 'Cache-Control': 'no-store' });
  if (setCookie) {
    headers.append('Set-Cookie', setCookie);
  }
  return new Response(null, { status: 302, headers });
}

// The Arena itself: what preview visitors get now, and every visitor once the gate is off.
const arena = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Rate limits (server/rate-limit.js, BE-3) run first for every /api/ request, so a limited
    // caller costs no upstream call. Allowed responses carry RateLimit-Policy.
    if (pathname.startsWith('/api/')) {
      const gate = await checkRateLimit(request, env, { verifyUser: verifiedUserId });
      if (gate.response) {
        return gate.response;
      }
      // Keep the request id the limiter chose, so the 429, the logs and the upstream agree.
      let forwarded = request;
      if (gate.requestId && request.headers.get('x-request-id') !== gate.requestId) {
        const headers = new Headers(request.headers);
        headers.set('x-request-id', gate.requestId);
        forwarded = new Request(request, { headers });
      }
      // /api/v2 is the Worker's own API (server/v2/). It never falls through to the v1 proxy.
      // Everything else under /api/ is the same-origin proxy (hardened: header allow-list,
      // request ids, no CORS, timeouts).
      const response = isV2Path(pathname) ? await handleV2(forwarded, env, ctx) : await proxyApi(forwarded, env);
      return gate.decorate(response);
    }

    // The text routes of the API docs (BE-5): /leaderboard.md, /llms.txt, /problems/ and
    // /problems/<slug>. GET and HEAD are served, anything else gets a 405 problem.
    if (isDocRoute(pathname)) {
      const docResponse = await handleDocRoute(request, env, ctx);
      // A browser that follows an unknown /problems/<slug> gets the site's 404 page, not raw JSON.
      if (
        docResponse.status === 404 &&
        pathname.startsWith('/problems') &&
        (request.headers.get('accept') || '').toLowerCase().includes('text/html')
      ) {
        const notFound = await serveNotFoundPage(request, env);
        if (notFound) return notFound;
      }
      return docResponse;
    }

    // 2. Permanent redirects for legacy URLs, from the table in server/redirects.js.
    const redirect = redirectResponse(url);
    if (redirect) {
      return redirect;
    }

    // 3. Client-only routes of the new web app (web/): React Router's SPA fallback page with
    // status 200 (SPA_FALLBACK_ROUTES in server/routing.js). Share links (/share/<id> and the old
    // ?id= forms) get it never cached, with the link-preview tags written in (server/share.js).
    if ((request.method === 'GET' || request.method === 'HEAD') && isSpaFallbackRoute(pathname)) {
      const fallback = isShareRoute(pathname)
        ? await serveSharePage(request, env, ctx)
        : await serveSpaFallback(request, env);
      if (fallback) {
        return fallback;
      }
    }

    // og-image.png placeholder
    if (pathname === '/og-image.png') {
      const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const minimalPng = Uint8Array.from(atob(minimalPngBase64), c => c.charCodeAt(0));
      return new Response(minimalPng, {
        headers: {
          'content-type': 'image/png',
          'cache-control': 'public, max-age=86400'
        },
      });
    }

    // 5. Serve static assets from ASSETS binding, with the caching table (server/caching.js)
    if (env?.ASSETS?.fetch) {
      let assetResponse = await env.ASSETS.fetch(request);

      if (assetResponse && assetResponse.status !== 404) {
        return withCaching(request, env, assetResponse, pathname);
      }

      // Try adding .html extension for clean URLs
      const hasExtension = pathname.split('/').pop()?.includes('.');
      if (!hasExtension && !pathname.endsWith('/')) {
        const htmlUrl = new URL(request.url);
        htmlUrl.pathname = pathname + '.html';
        assetResponse = await env.ASSETS.fetch(new Request(htmlUrl, request));
        if (assetResponse && assetResponse.status !== 404) {
          return withCaching(request, env, assetResponse, htmlUrl.pathname);
        }
      }

      // Try index.html for directory paths
      if (pathname.endsWith('/') || !hasExtension) {
        const indexUrl = new URL(request.url);
        indexUrl.pathname = pathname.endsWith('/') ? pathname + 'index.html' : pathname + '/index.html';
        assetResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (assetResponse && assetResponse.status !== 404) {
          return withCaching(request, env, assetResponse, indexUrl.pathname);
        }
      }
    }

    // Nothing matched: the web app's 404 page (dist/404.html) with status 404.
    const notFound = await serveNotFoundPage(request, env);
    if (notFound) {
      return notFound;
    }

    return new Response('Not Found', { status: 404 });
  },
};

function serveArena(request, env, ctx) {
  return arena.fetch(request, env, ctx);
}

function isV2Path(pathname) {
  return pathname === '/api/v2' || pathname.startsWith('/api/v2/');
}

// The id of the user a Bearer token verifies to (the BE-0 verifier), or null. Only a verified
// token picks the rate-limit key: an unverified `sub` is never read. Lazy import, like handleV2.
async function verifiedUserId(request, env) {
  try {
    const { buildVerifier } = await import('./server/v2/auth/composite.ts');
    const verifier = buildVerifier(env);
    if (!verifier) return null;
    const match = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get('authorization') || '');
    if (!match) return null;
    return (await verifier.verify(match[1])).id;
  } catch {
    return null;
  }
}

// Loaded with a dynamic import so the Node tests of the other modules, which never touch
// /api/v2, do not need the router's dependencies installed. If the router cannot be loaded,
// v2 answers 503 and everything else (v1, static files) keeps working.
async function handleV2(request, env, ctx) {
  let app;
  try {
    app = await import('./server/v2/app.ts');
  } catch (error) {
    console.error(JSON.stringify({ event: 'api_v2_unavailable', error: String(error) }));
    return v2UnavailableResponse(request);
  }
  return app.handle(request, env, ctx);
}

function isDocRoute(pathname) {
  return (
    pathname === '/leaderboard.md' ||
    pathname === '/llms.txt' ||
    pathname === '/problems' ||
    pathname.startsWith('/problems/')
  );
}

// Same lazy import as handleV2: the doc routes live in server/v2/docs/ and share the leaderboard
// service. If they cannot be loaded, they answer 503 and everything else keeps working.
async function handleDocRoute(request, env, ctx) {
  let docs;
  try {
    docs = await import('./server/v2/docs/routes.ts');
  } catch (error) {
    console.error(JSON.stringify({ event: 'api_v2_unavailable', error: String(error) }));
    return v2UnavailableResponse(request);
  }
  return docs.serveDocRoute(request, env, ctx);
}

function v2UnavailableResponse(request) {
  const requestId = sanitizeRequestId(request.headers.get('x-request-id')) ?? crypto.randomUUID();
  const body = {
    type: problemTypeUrl('service_unavailable'),
    title: 'Service unavailable',
    status: 503,
    detail: 'The API is temporarily unavailable.',
    instance: new URL(request.url).pathname,
    requestId,
  };
  return new Response(JSON.stringify(body), {
    status: 503,
    headers: {
      'Content-Type': 'application/problem+json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}

function isHtmlResponse(response) {
  return (response.headers.get('content-type') || '').includes('text/html');
}

// A file from dist/: Cache-Control from the caching table, and noindex for the style guide.
// `rulePath` is the path the rules look at (the file that was found, for the clean-URL fallbacks).
async function withCaching(request, env, assetResponse, rulePath) {
  const response = new Response(assetResponse.body, assetResponse);
  const html = isHtmlResponse(response);
  const manifest = html ? await loadWebManifest(request, env) : null;
  const cacheControl = cacheControlFor({
    pathname: rulePath,
    webPage: Boolean(manifest?.pages.has(rulePath)),
    html,
  });
  if (cacheControl) {
    response.headers.set('cache-control', cacheControl);
  }
  if (isNoindexPath(rulePath)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

// Every response leaves through here: security headers, and the Content-Security-Policy for
// HTML. Web app pages get the enforced policy with the build's script hashes; if the manifest
// is missing, they fall back to report-only so a broken build cannot blank the page.
async function withSecurityHeaders(request, env, response) {
  const { pathname } = new URL(request.url);
  const secured = new Response(response.body, response);

  if (response.status >= 300 && response.status < 400) {
    applySecurityHeaders(secured.headers, { kind: 'other' });
  } else if (pathname.startsWith('/api/') || isV2Path(pathname)) {
    applySecurityHeaders(secured.headers, { kind: 'api' });
  } else if (isHtmlResponse(response)) {
    const manifest = await loadWebManifest(request, env);
    const webPage =
      Boolean(manifest?.pages.has(pathname)) ||
      // The 404 page is a web page, served at whatever address was not found.
      (response.status === 404 && Boolean(manifest?.pages.has(NOT_FOUND_PAGE))) ||
      isSpaFallbackRoute(pathname) ||
      pathname === SPA_FALLBACK_PATH;
    if (webPage) {
      applySecurityHeaders(secured.headers, {
        kind: 'web-page',
        csp: webContentSecurityPolicy(manifest ?? {}),
        cspReportOnly: !manifest,
      });
    } else {
      applySecurityHeaders(secured.headers, {
        kind: 'legacy-page',
        csp: LEGACY_CONTENT_SECURITY_POLICY,
        cspReportOnly: true,
      });
    }
  } else {
    applySecurityHeaders(secured.headers, { kind: 'other' });
  }

  return secured;
}
