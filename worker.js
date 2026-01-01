import indexHtml from "./index.html";
import styleCss from "./style.css";

import aboutIndex from "./about/index.html";
import careersIndex from "./careers/index.html";
import howItWorksIndex from "./how-it-works/index.html";
import loginIndex from "./login/index.html";
import leaderboardIndex from "./leaderboard/index.html";
import modelsIndex from "./models/index.html";
import faqIndex from "./faq/index.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response(`User-agent: *
Allow: /

Sitemap: https://arena.dualmindlab.tech/sitemap.xml`, {
        headers: { 
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=86400"
        },
      });
    }

    if (url.pathname === "/sitemap.xml") {
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
          "content-type": "application/xml; charset=utf-8",
          "cache-control": "public, max-age=86400"
        },
      });
    }

    if (url.pathname === "/style.css") {
      return new Response(styleCss, {
        headers: { 
          "content-type": "text/css",
          "cache-control": "public, max-age=31536000"
        },
      });
    }

    if (url.pathname === "/about" || url.pathname === "/about/") {
      return new Response(aboutIndex, {
        headers: { 
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300, must-revalidate"
        },
      });
    }

    if (url.pathname === "/about/index.html") {
      return new Response(aboutIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/careers" || url.pathname === "/careers/") {
      return new Response(careersIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/careers/index.html") {
      return new Response(careersIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/how-it-works" || url.pathname === "/how-it-works/") {
      return new Response(howItWorksIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/how-it-works/index.html") {
      return new Response(howItWorksIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/login" || url.pathname === "/login/") {
      return new Response(loginIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/login/index.html") {
      return new Response(loginIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/leaderboard" || url.pathname === "/leaderboard/") {
      return new Response(leaderboardIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/leaderboard/index.html") {
      return new Response(leaderboardIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/models" || url.pathname === "/models/") {
      return new Response(modelsIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/models/index.html") {
      return new Response(modelsIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/faq" || url.pathname === "/faq/") {
      return new Response(faqIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    if (url.pathname === "/faq/index.html") {
      return new Response(faqIndex, {
        headers: { "content-type": "text/html" },
      });
    }

    // default → index.html
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(indexHtml, {
        headers: { 
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300, must-revalidate"
        },
      });
    }

    // Handle og-image.png (placeholder until proper image is created)
    // TODO: Replace this handler with actual og-image.png file (1200x630px recommended)
    // Create the file and place it in root directory, then remove this handler
    if (url.pathname === "/og-image.png") {
      // Return a minimal transparent PNG (1x1 pixel) as base64
      // In production, replace this handler with the actual og-image.png file in assets
      const minimalPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const minimalPng = Uint8Array.from(atob(minimalPngBase64), c => c.charCodeAt(0));
      return new Response(minimalPng, {
        headers: { 
          "content-type": "image/png",
          "cache-control": "public, max-age=86400"
        },
      });
    }

    // Everything else (theme.js, script.js, images, login/style.css, etc.)
    // should be served by the static assets handler.
    if (env?.ASSETS?.fetch) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};
