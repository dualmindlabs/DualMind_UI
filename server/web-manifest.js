// The web app's build manifest, dist/__web-manifest.json, written by build.js:
//   { "version": 1, "pages": ["/design/", "/__spa-fallback"], "scriptHashes": ["<base64>"...],
//     "connectSrc": ["https://<project>.supabase.co", "wss://<project>.supabase.co"] }
// It travels in dist/ with the pages it describes, so the Worker's CSP hashes always match the
// HTML it serves. The Worker reads it once per isolate through env.ASSETS.

export const WEB_MANIFEST_PATH = '/__web-manifest.json';

/** @typedef {{ pages: Set<string>, scriptHashes: string[], connectSrc: string[] }} WebManifest */

/** @type {WebManifest | null} */
let cached = null;

const HASH_RE = /^[A-Za-z0-9+/]{43}=$/;
const ORIGIN_RE = /^(https|wss):\/\/[a-z0-9.-]+(:\d+)?$/;

/**
 * @param {unknown} data
 * @returns {WebManifest | null}
 */
export function parseWebManifest(data) {
  if (!data || typeof data !== 'object') return null;
  const { pages, scriptHashes, connectSrc = [] } = /** @type {Record<string, unknown>} */ (data);
  if (!Array.isArray(pages) || !pages.every(page => typeof page === 'string' && page.startsWith('/'))) {
    return null;
  }
  if (!Array.isArray(scriptHashes) || !scriptHashes.every(hash => typeof hash === 'string' && HASH_RE.test(hash))) {
    return null;
  }
  if (!Array.isArray(connectSrc) || !connectSrc.every(origin => typeof origin === 'string' && ORIGIN_RE.test(origin))) {
    return null;
  }
  return { pages: new Set(pages), scriptHashes: [...scriptHashes], connectSrc: [...connectSrc] };
}

/**
 * The manifest, or null when it is missing or invalid (then web pages get a report-only CSP
 * instead of a policy that would block their scripts). Only a valid manifest is cached.
 * @param {Request} request
 * @param {{ ASSETS?: { fetch: (request: Request) => Promise<Response> } }} env
 * @returns {Promise<WebManifest | null>}
 */
export async function loadWebManifest(request, env) {
  if (cached) return cached;
  if (!env?.ASSETS?.fetch) return null;
  try {
    const response = await env.ASSETS.fetch(new Request(new URL(WEB_MANIFEST_PATH, request.url)));
    if (response.status !== 200) return null;
    cached = parseWebManifest(await response.json());
    return cached;
  } catch {
    return null;
  }
}

/** For tests: forget the cached manifest. */
export function resetWebManifestCache() {
  cached = null;
}
