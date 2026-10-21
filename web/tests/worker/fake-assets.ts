/**
 * A stand-in for the Workers static assets binding (env.ASSETS) with the default
 * `html_handling: "auto-trailing-slash"` behaviour: /dir/ serves dir/index.html, /page serves
 * page.html, /dir redirects to /dir/, and /page.html or /dir/index.html redirect to the clean URL.
 */
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function contentType(file: string): string {
  const extension = file.slice(file.lastIndexOf('.'));
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

export interface FakeAssets {
  fetch: (request: Request) => Promise<Response>;
  requested: string[];
}

export function fakeAssets(files: Record<string, string>): FakeAssets {
  const requested: string[] = [];
  const has = (file: string) => Object.prototype.hasOwnProperty.call(files, file);

  const serve = (file: string) =>
    new Response(files[file], {
      status: 200,
      headers: {
        'content-type': contentType(file),
        'cache-control': 'public, max-age=0, must-revalidate',
        etag: `"${file}"`,
      },
    });
  const redirect = (to: string, search: string) =>
    new Response(null, { status: 307, headers: { location: `${to}${search}` } });
  const notFound = () => new Response('not found', { status: 404 });

  return {
    requested,
    fetch(request: Request) {
      const url = new URL(request.url);
      const path = decodeURIComponent(url.pathname);
      requested.push(path);

      let response: Response;
      if (path.endsWith('/')) {
        response = has(`${path}index.html`) ? serve(`${path}index.html`) : notFound();
      } else if (path.endsWith('/index.html')) {
        response = has(path)
          ? redirect(path.slice(0, -'index.html'.length), url.search)
          : notFound();
      } else if (path.endsWith('.html')) {
        response = has(path) ? redirect(path.slice(0, -'.html'.length), url.search) : notFound();
      } else if (has(path)) {
        response = serve(path);
      } else if (has(`${path}.html`)) {
        response = serve(`${path}.html`);
      } else if (has(`${path}/index.html`)) {
        response = redirect(`${path}/`, url.search);
      } else {
        response = notFound();
      }
      return Promise.resolve(response);
    },
  };
}

/**
 * A small composed dist/: legacy pages and files plus the web app's output. Since slice S3 the
 * landing page is the web app's /index.html, and the legacy arena lives on as /legacy-app.html.
 */
export const DIST: Record<string, string> = {
  '/index.html': '<!doctype html><title>DualMind Arena: blind battles between AI models</title>',
  '/legacy-app.html': '<!doctype html><title>Legacy arena</title>',
  '/leaderboard/index.html': '<!doctype html><title>Legacy leaderboard</title>',
  '/models/index.html': '<!doctype html><title>Legacy models</title>',
  '/about/index.html': '<!doctype html><title>About DualMind Arena</title>',
  '/404.html':
    '<!doctype html><title>Page not found · DualMind Arena</title><p>This page took a wrong turn.</p>',
  '/robots.txt': 'User-agent: *\nAllow: /\n\nSitemap: https://arena.dualmindlab.tech/sitemap.xml\n',
  '/sitemap.xml':
    '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://arena.dualmindlab.tech/about/</loc></url></urlset>',
  '/assets/logo.png': 'png',
  '/js/apiInstance.js': 'console.log("legacy");',
  '/css/tokens.css': ':root{}',
  '/design/index.html': '<!doctype html><title>Design system · DualMind Arena</title>',
  '/__spa-fallback.html': '<!doctype html><title>Loading</title>',
  '/__web-manifest.json': JSON.stringify({
    version: 1,
    pages: ['/', '/404', '/__spa-fallback', '/about/', '/design/'],
    scriptHashes: ['CihokcEcBW4atb/CW/XWsvWwbTjqwQlE9nj9ii5ww5M='],
    connectSrc: [],
  }),
  '/assets/root-AbCd_123.js': 'export {};',
  '/assets/root-Zz9-xY12.css': 'body{}',
  '/assets/bricolage-grotesque-latin-opsz-normal-Q1w2E3r4.woff2': 'font',
};
