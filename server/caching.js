// Cache-Control rules for everything the Arena Worker serves from dist/, as one table
// (docs/architecture.md, "Caching"). The first matching row wins; when no row matches, the
// header from Workers static assets stays as it is. API responses never pass through here:
// /api/* keeps whatever the backend sends.

import { isHashedAsset, SPA_FALLBACK_PATH } from './routing.js';

export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
export const LEGACY_NO_STORE = 'no-store, no-cache, must-revalidate, max-age=0';
export const SHARE_NO_STORE = 'no-store, no-cache, must-revalidate';
/** Revalidate on every visit; cheap, because Workers static assets answer with an ETag. */
export const REVALIDATE = 'no-cache';

const IMAGE_RE = /\.(png|jpe?g|webp|gif|svg|ico)$/;
const LEGACY_CODE_RE = /\.(html|js|css|json)$/;

/**
 * @typedef {{ pathname: string, webPage: boolean, html?: boolean }} CacheContext
 * @typedef {{ name: string, applies: string, cacheControl: string, test: (context: CacheContext) => boolean }} CacheRule
 */

/** @type {readonly CacheRule[]} */
export const CACHE_RULES = [
  {
    name: 'hashed-build-file',
    applies: 'Vite output of web/: /assets/<name>-<hash>.<ext>',
    cacheControl: IMMUTABLE_CACHE,
    test: ({ pathname }) => isHashedAsset(pathname),
  },
  {
    name: 'share',
    applies: '/share and everything below it (the share page, served by server/share.js)',
    cacheControl: SHARE_NO_STORE,
    test: ({ pathname }) => pathname === '/share' || pathname.startsWith('/share/'),
  },
  {
    name: 'web-page',
    applies: 'HTML pages of the web app (prerendered pages, SPA fallback)',
    cacheControl: REVALIDATE,
    test: ({ pathname, webPage }) =>
      webPage || pathname === SPA_FALLBACK_PATH || pathname === `${SPA_FALLBACK_PATH}.html`,
  },
  {
    name: 'legacy-code',
    applies:
      'Legacy HTML (incl. directory pages and clean URLs such as /login-modern), JS, CSS and JSON, until the cutover',
    cacheControl: LEGACY_NO_STORE,
    test: ({ pathname, html = false }) => {
      const lower = pathname.toLowerCase();
      return lower.endsWith('/') || LEGACY_CODE_RE.test(lower) || html;
    },
  },
  {
    name: 'image',
    applies: 'Images (.png .jpg .jpeg .webp .gif .svg .ico)',
    cacheControl: IMMUTABLE_CACHE,
    test: ({ pathname }) => IMAGE_RE.test(pathname.toLowerCase()),
  },
];

/**
 * @param {CacheContext} context
 * @returns {string | null} the Cache-Control value, or null to keep the asset default
 */
export function cacheControlFor(context) {
  return CACHE_RULES.find(rule => rule.test(context))?.cacheControl ?? null;
}
