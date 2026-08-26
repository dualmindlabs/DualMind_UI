export default {
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

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }



    // Force all non-API traffic to the waitlist worker
    if (!pathname.startsWith('/api/')) {
      const redirectUrl = new URL('https://early.dualmindlab.tech/');
      redirectUrl.search = url.search;
      if (!redirectUrl.searchParams.has('ref')) {
        redirectUrl.searchParams.set('ref', 'arena');
      }
      return Response.redirect(redirectUrl.toString(), 302);
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
    <loc>https://${domain}/careers/</loc>
    <lastmod>2026-01-23</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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

    // Ads.txt
    if (pathname === '/ads.txt') {
      return new Response('google.com, pub-7046688828386115, DIRECT, f08c47fec0942fa0', {
        headers: {
          'content-type': 'text/plain; charset=utf-8',
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
