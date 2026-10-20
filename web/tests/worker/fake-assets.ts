/**
 * A stand-in for the Workers static assets binding (env.ASSETS) with the default
 * `html_handling: "auto-trailing-slash"` behaviour: /dir/ serves dir/index.html, /page serves
 * page.html, /dir redirects to /dir/, and /page.html or /dir/index.html redirect to the clean URL.
 */
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
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
        response = has(path) ? redirect(path.slice(0, -'index.html'.length), url.search) : notFound();
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

/** A small composed dist/: legacy pages and files plus the web app's output. */
export const DIST: Record<string, string> = {
  '/index.html': '<!doctype html><title>Legacy arena</title>',
  '/leaderboard/index.html': '<!doctype html><title>Legacy leaderboard</title>',
  '/about/index.html': '<!doctype html><title>Legacy about</title>',
  '/assets/logo.png': 'png',
  '/js/apiInstance.js': 'console.log("legacy");',
  '/css/tokens.css': ':root{}',
  '/design/index.html': '<!doctype html><title>Design system · DualMind Arena</title>',
  '/__spa-fallback.html': '<!doctype html><title>Loading</title>',
  '/assets/root-AbCd_123.js': 'export {};',
  '/assets/root-Zz9-xY12.css': 'body{}',
  '/assets/bricolage-grotesque-latin-opsz-normal-Q1w2E3r4.woff2': 'font',
};
