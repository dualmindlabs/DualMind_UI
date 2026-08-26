export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    // 2. If wishlist flag is deactivated, redirect user to the live Arena app
    if (!isWishlistActive) {
      return Response.redirect('https://arena.dualmindlab.tech' + url.pathname + url.search, 302);
    }

    // 3. Serve the standalone waitlist static assets
    if (env?.ASSETS?.fetch) {
      return await env.ASSETS.fetch(request);
    }

    return new Response('DualMind Waitlist', { status: 200 });
  }
};
