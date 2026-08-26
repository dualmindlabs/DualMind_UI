export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const referer = request.headers.get('referer') || 'direct';
    const ua = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const country = request.cf?.country || 'unknown';

    // Log every request so you can see traffic in wrangler tail / Workers Logs
    console.log(JSON.stringify({
      type: 'waitlist-traffic',
      timestamp: new Date().toISOString(),
      method: request.method,
      pathname: url.pathname,
      search: url.search,
      referer,
      ua,
      ip,
      country
    }));

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
      const response = new Response(assetResponse.body, assetResponse);
      response.headers.set('X-Waitlist-Traffic', 'logged');
      response.headers.set('X-Traffic-Referer', referer);
      return response;
    }

    return new Response('DualMind Waitlist', { status: 200 });
  }
};
