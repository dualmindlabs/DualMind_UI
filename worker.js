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
const FORCE_WAITLIST = true;
const WAITLIST_URL = 'https://early.dualmindlab.tech/';
const PREVIEW_CODE = 'dualmind-preview';
const PREVIEW_COOKIE = 'dm_preview';
const PREVIEW_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds
const PREVIEW_COOKIE_ATTRIBUTES = 'Path=/; Secure; HttpOnly; SameSite=Lax';

export default {
  async fetch(request, env) {
    if (!FORCE_WAITLIST) {
      return serveArena(request, env);
    }

    const url = new URL(request.url);
    const preview = url.searchParams.get('preview');

    if (preview === 'off') {
      return waitlistRedirect(url, `${PREVIEW_COOKIE}=; Max-Age=0; ${PREVIEW_COOKIE_ATTRIBUTES}`);
    }

    if (preview === PREVIEW_CODE) {
      const response = await serveArena(request, env);
      const withCookie = new Response(response.body, response);
      withCookie.headers.append('Set-Cookie', `${PREVIEW_COOKIE}=1; Max-Age=${PREVIEW_MAX_AGE}; ${PREVIEW_COOKIE_ATTRIBUTES}`);
      withCookie.headers.set('Cache-Control', 'private, no-store');
      return withCookie;
    }

    if (hasPreviewCookie(request)) {
      return serveArena(request, env);
    }

    return waitlistRedirect(url);
  },
};

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

// The Arena itself: what every request got before the pre-launch redirect, and what preview
// visitors get now. Unchanged apart from being moved under this name.
const arena = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers for API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
      'Access-Control-Max-Age': '86400',
    };

    // The copied careers page was removed; send old links to /about/ (permanent, query kept)
    if (pathname === '/careers' || pathname.startsWith('/careers/')) {
      const target = new URL('/about/', url);
      target.search = url.search;
      return Response.redirect(target.toString(), 301);
    }

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // API Proxy: Forward /api/* requests to backend server
    if (pathname.startsWith('/api/')) {
      const backendUrl = env?.BACKEND_URL || 'https://api.dualmindlab.tech';

      // Map frontend /api/health to backend /health
      let backendPath = pathname;
      if (pathname === '/api/health') {
        backendPath = '/health';
      }

      const backendRequestUrl = new URL(backendPath + url.search, backendUrl);

      try {
        const backendResponse = await fetch(backendRequestUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        });

        const response = new Response(backendResponse.body, backendResponse);
        Object.keys(corsHeaders).forEach(key => {
          response.headers.set(key, corsHeaders[key]);
        });

        response.headers.set('x-dualmind-proxy-backend', backendUrl);
        response.headers.set('x-dualmind-proxy-path', backendPath);

        return response;
      } catch (error) {
        console.error('Worker proxy error:', error);
        return new Response(JSON.stringify({
          success: false,
          message: 'Backend API Error: ' + error.message,
          error: error.toString()
        }), {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    // Handle /share/* routes explicitly for thread sharing
    if (pathname.startsWith('/share')) {
      if (env?.ASSETS?.fetch) {
        // Rewrite all /share/* requests to /share/index.html
        const shareUrl = new URL(request.url);
        shareUrl.pathname = '/share/index.html';

        let assetResponse = await env.ASSETS.fetch(new Request(shareUrl, request));

        if (assetResponse && assetResponse.status !== 404) {
          const response = new Response(assetResponse.body, assetResponse);
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set('X-Frame-Options', 'DENY');
          // Important: Cache control to prevent stale share pages
          response.headers.set('cache-control', 'no-store, no-cache, must-revalidate');
          return response;
        }
      }
    }

    // robots.txt
    if (pathname === '/robots.txt') {
      const domain = url.hostname;
      return new Response(`User-agent: *
Allow: /

Sitemap: https://${domain}/sitemap.xml`, {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=86400'
        },
      });
    }

    // sitemap.xml
    if (pathname === '/sitemap.xml') {
      const domain = url.hostname;
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${domain}/about/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${domain}/how-it-works/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${domain}/leaderboard/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://${domain}/models/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://${domain}/faq/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://${domain}/privacy/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://${domain}/terms/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://${domain}/cookies/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.4</priority>
  </url>
  <url>
    <loc>https://${domain}/login/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`, {
        headers: {
          'content-type': 'application/xml; charset=utf-8',
          'cache-control': 'public, max-age=86400'
        },
      });
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

    // Serve static assets from ASSETS binding
    if (env?.ASSETS?.fetch) {
      let assetResponse = await env.ASSETS.fetch(request);

      // If asset found, add security headers and return
      if (assetResponse && assetResponse.status !== 404) {
        const response = new Response(assetResponse.body, assetResponse);
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-XSS-Protection', '1; mode=block');

        // Prevent stale deployments being cached (especially JS/CSS/HTML)
        const lower = pathname.toLowerCase();
        const isHtml = lower.endsWith('.html') || lower === '/' || lower.endsWith('/');
        const isJs = lower.endsWith('.js');
        const isCss = lower.endsWith('.css');
        const isJson = lower.endsWith('.json');
        const isImage = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || lower.endsWith('.gif') || lower.endsWith('.svg') || lower.endsWith('.ico');

        if (isHtml || isJs || isCss || isJson) {
          response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
        } else if (isImage) {
          response.headers.set('cache-control', 'public, max-age=31536000, immutable');
        }

        return response;
      }

      // Try adding .html extension for clean URLs
      const hasExtension = pathname.split('/').pop()?.includes('.');
      if (!hasExtension && !pathname.endsWith('/')) {
        const htmlUrl = new URL(request.url);
        htmlUrl.pathname = pathname + '.html';
        assetResponse = await env.ASSETS.fetch(new Request(htmlUrl, request));
        if (assetResponse && assetResponse.status !== 404) {
          const response = new Response(assetResponse.body, assetResponse);
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set('X-Frame-Options', 'DENY');
          response.headers.set('X-XSS-Protection', '1; mode=block');
            response.headers.set('cache-control', 'no-store, no-cache, must-revalidate, max-age=0');
          return response;
        }
      }

      // Try index.html for directory paths
      if (pathname.endsWith('/') || !hasExtension) {
        const indexUrl = new URL(request.url);
        indexUrl.pathname = pathname.endsWith('/') ? pathname + 'index.html' : pathname + '/index.html';
        assetResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
        if (assetResponse && assetResponse.status !== 404) {
          const response = new Response(assetResponse.body, assetResponse);
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set('X-Frame-Options', 'DENY');
          response.headers.set('X-XSS-Protection', '1; mode=block');
            return response;
        }
      }
    }

    // Serve custom 404.html if asset is not found
    if (env?.ASSETS?.fetch) {
      try {
        const errorUrl = new URL(request.url);
        errorUrl.pathname = '/404.html';
        const errorResponse = await env.ASSETS.fetch(new Request(errorUrl, request));
        if (errorResponse && errorResponse.status !== 404) {
          const response = new Response(errorResponse.body, {
            status: 404,
            statusText: 'Not Found',
            headers: errorResponse.headers
          });
          response.headers.set('content-type', 'text/html; charset=utf-8');
          response.headers.set('X-Content-Type-Options', 'nosniff');
          response.headers.set('X-Frame-Options', 'DENY');
          return response;
        }
      } catch (error) {
        console.error('Failed to load custom 404 page:', error);
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

function serveArena(request, env) {
  return arena.fetch(request, env);
}
