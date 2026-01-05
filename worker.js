export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS headers for API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // API Proxy: Forward /api/* requests to backend server
    if (pathname.startsWith('/api/')) {
      console.log('Worker proxy: intercepting', pathname);

      const backendUrl = 'https://api.dualmindlab.tech';
      
      // Map frontend /api/health to backend /health
      let backendPath = pathname;
      if (pathname === '/api/health') {
        backendPath = '/health';
        console.log('Worker proxy: mapping /api/health -> /health');
      }
      
      const backendRequestUrl = new URL(backendPath + url.search, backendUrl);
      console.log('Worker proxy: forwarding to', backendRequestUrl.toString());

      try {
        const backendResponse = await fetch(backendRequestUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null,
        });

        console.log('Worker proxy: backend responded with', backendResponse.status);

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

    // robots.txt
    if (pathname === '/robots.txt') {
      return new Response(`User-agent: *
Allow: /

Sitemap: https://arena.dualmindlab.tech/sitemap.xml`, {
        headers: { 
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'public, max-age=86400'
        },
      });
    }

    // sitemap.xml
    if (pathname === '/sitemap.xml') {
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://arena.dualmindlab.tech/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/about/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/how-it-works/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/leaderboard/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/models/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/faq/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://arena.dualmindlab.tech/careers/</loc>
    <lastmod>2026-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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

    return new Response('Not Found', { status: 404 });
  },
};
