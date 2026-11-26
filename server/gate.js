// What the pre-launch gate (FORCE_WAITLIST in worker.js) lets through. A visitor who is sent to
// the waitlist must still be able to read the legal pages that explain what happens to their
// data: privacy, terms and cookies, security.txt under /.well-known/, and the files those pages
// load. Only GET and HEAD pass; the Arena itself (every other page and /api/*) stays behind the
// gate.

const LEGAL_PAGES = ['/privacy', '/terms', '/cookies'];
const PREFIXES = ['/.well-known/', '/assets/', '/og/'];
const FAVICON_FILES = /^\/(favicon[^/]*|apple-touch-icon[^/]*)$/;

/**
 * @param {string} method
 * @param {string} pathname
 * @returns {boolean}
 */
export function isGatePassthrough(method, pathname) {
  const verb = method.toUpperCase();
  if (verb !== 'GET' && verb !== 'HEAD') return false;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (LEGAL_PAGES.includes(path)) return true;
  if (pathname.includes('..')) return false;
  if (PREFIXES.some(prefix => pathname.startsWith(prefix))) return true;
  return FAVICON_FILES.test(pathname);
}

/**
 * The gate is on unless the FORCE_WAITLIST variable says "false" (or "0"). The default stays on,
 * so a deploy without the variable keeps today's behaviour.
 * @param {{ FORCE_WAITLIST?: string | boolean } | undefined} env
 */
export function gateEnabled(env) {
  const value = String(env?.FORCE_WAITLIST ?? 'true').trim().toLowerCase();
  return value !== 'false' && value !== '0';
}
