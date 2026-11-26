import { handleSignup } from './server/signup.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Waitlist API: POST /api/signup saves an email in D1 (see server/signup.js). There is no
    // traffic log here: it ran only for requests no static file matched, mostly bots, and it
    // wrote raw IP addresses.
    if (url.pathname === '/api/signup') {
      return handleSignup(request, env);
    }
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }

    // 1. Check Flagship or environment variable flag
    let isWishlistActive = true;
    try {
      if (env?.FLAGS?.getBooleanValue) {
        isWishlistActive = await env.FLAGS.getBooleanValue('wishlist-active', true);
      } else if (env?.WISHLIST_ACTIVE !== undefined) {
        isWishlistActive = env.WISHLIST_ACTIVE === 'true' || env.WISHLIST_ACTIVE === true;
      }
    } catch (e) {
      console.warn('Flag check error in waitlist worker:', e);
    }

    // 2. If wishlist flag is deactivated, redirect user to the live Arena app.
    // WARNING: arena.dualmindlab.tech now redirects TO this worker, so setting
    // this flag to false will create a redirect loop. Only disable when arena no
    // longer redirects here.
    if (!isWishlistActive) {
      return Response.redirect('https://arena.dualmindlab.tech' + url.pathname + url.search, 302);
    }

    // 3. Serve the standalone waitlist static assets
    if (env?.ASSETS?.fetch) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status === 404) {
        return notFoundPage(request, env, assetResponse);
      }
      return assetResponse;
    }

    return new Response('DualMind Waitlist', { status: 200 });
  }
};

// An unknown address gets the 404 page (public/404.html, served as /404) with status 404. If the
// page itself cannot be loaded, the plain 404 from the assets stands.
async function notFoundPage(request, env, fallback) {
  try {
    const page = await env.ASSETS.fetch(new Request(new URL('/404', request.url)));
    if (page.status !== 200) return fallback;
    const headers = new Headers(page.headers);
    headers.set('Cache-Control', 'no-cache');
    headers.set('X-Robots-Tag', 'noindex');
    headers.delete('etag');
    return new Response(request.method === 'HEAD' ? null : page.body, { status: 404, headers });
  } catch {
    return fallback;
  }
}
