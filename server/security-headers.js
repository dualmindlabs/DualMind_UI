// Security headers for every response the Arena Worker sends, and the Content-Security-Policy
// for HTML (docs/architecture.md, "Security headers and CSP").
//
// - Web app pages (React Router output, listed in dist/__web-manifest.json) get an ENFORCED CSP
//   without 'unsafe-inline' for scripts: build.js hashes every inline <script> of the built HTML
//   (sha256) and the policy allows exactly those hashes.
// - Legacy pages get Content-Security-Policy-Report-Only with a policy that matches what they
//   load today (CDN scripts and styles, Google Fonts, Supabase, the API), so nothing breaks;
//   violations show in the browser console. It becomes enforced, or disappears with the legacy
//   pages, at the cutover (slice S13).

/** Sent on every response, documents and files alike. */
export const BASE_SECURITY_HEADERS = Object.freeze({
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), geolocation=(), payment=(), usb=(), microphone=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin',
  // Old browsers; frame-ancestors 'none' in the CSP is the modern equivalent.
  'X-Frame-Options': 'DENY',
});

/** Sent on /api/* responses: no document-only headers, the backend's own headers stay. */
export const API_SECURITY_HEADERS = Object.freeze({
  'Strict-Transport-Security': BASE_SECURITY_HEADERS['Strict-Transport-Security'],
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': BASE_SECURITY_HEADERS['Referrer-Policy'],
});

/** Deprecated, and harmful in old browsers; never sent. */
export const REMOVED_HEADERS = Object.freeze(['X-XSS-Protection']);

/**
 * The enforced policy for web app pages.
 * @param {{ scriptHashes?: readonly string[], connectSrc?: readonly string[] }} [options]
 *   scriptHashes: base64 sha256 hashes of the inline scripts (from build.js)
 *   connectSrc: extra origins for fetch/WebSocket, e.g. the Supabase project (from build.js)
 */
export function webContentSecurityPolicy({ scriptHashes = [], connectSrc = [] } = {}) {
  const hashes = scriptHashes.map(hash => `'sha256-${hash}'`);
  return [
    "default-src 'self'",
    ['script-src', "'self'", ...hashes].join(' '),
    // React writes style attributes (swatches, bar widths); no inline <style> blocks are used.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    ['connect-src', "'self'", ...connectSrc].join(' '),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Report-only policy for the legacy pages: everything they load today is allowed. */
export const LEGACY_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com",
  "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  // http://localhost:5079 is the local API config.js uses on localhost (development only).
  "connect-src 'self' https://api.dualmindlab.tech https://*.supabase.co wss://*.supabase.co https://api.pwnedpasswords.com https://cdn.jsdelivr.net http://localhost:5079",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * Applies the headers for one response, in place.
 * @param {Headers} headers
 * @param {{ kind: 'api' | 'web-page' | 'legacy-page' | 'other', csp?: string, cspReportOnly?: boolean }} options
 */
export function applySecurityHeaders(headers, { kind, csp, cspReportOnly = false }) {
  for (const name of REMOVED_HEADERS) {
    headers.delete(name);
  }
  const base = kind === 'api' ? API_SECURITY_HEADERS : BASE_SECURITY_HEADERS;
  for (const [name, value] of Object.entries(base)) {
    headers.set(name, value);
  }
  if (kind === 'web-page' || kind === 'legacy-page') {
    headers.delete('Content-Security-Policy');
    headers.delete('Content-Security-Policy-Report-Only');
    if (csp) {
      headers.set(cspReportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy', csp);
    }
  }
}
