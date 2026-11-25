// Model data in the HTML of /leaderboard/ and /models/ for crawlers that do not run JavaScript.
//
// The pages are prerendered with "Loading the leaderboard ..." (the rankings load in the browser),
// so Bing, DuckDuckGo, link previews and AI crawlers saw no model at all. The Worker now writes
// the current top of the board into the page with HTMLRewriter, the same way server/share.js
// writes link-preview tags:
//   - an ItemList (schema.org) as JSON-LD in <head>
//   - a <noscript> table at the end of <body>, labelled with the time the data was generated
// The data comes from the leaderboard service (server/v2/leaderboard/), which keeps it in the
// Cache API for a minute, so a crawler burst does not reach the DualMind API. The look-up has a
// short timeout and is fail-safe: if it is slow or fails, the page goes out unchanged. Without
// HTMLRewriter (Node tests) nothing happens either. A signed-in browser never sees the table
// (noscript) and React hydrates as before (extra nodes at the end of <body> and <head> are
// ignored by React 19).

import { escapeHtml } from './share.js';

/** How long the page waits for the board before it goes out without it. */
export const SEO_BOARD_TIMEOUT_MS = 1500;
/** How many models the table and the list carry. */
export const SEO_MAX_ITEMS = 20;

/** @typedef {'leaderboard' | 'models'} SeoKind */

/**
 * @param {string} pathname
 * @returns {SeoKind | null}
 */
export function seoKindFor(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/leaderboard') return 'leaderboard';
  if (path === '/models') return 'models';
  return null;
}

const PAGE_PATH = { leaderboard: '/leaderboard/', models: '/models/' };
const PAGE_TITLE = { leaderboard: 'Leaderboard', models: 'Models' };

/**
 * @typedef {{ displayName: string, providerName: string, eloScore: number, eloRank: number,
 *   totalResponses: number, winRate: number, provisional: boolean }} BoardItem
 * @typedef {{ items: BoardItem[], meta: { generatedAt: string } }} Board
 */

/** The first SEO_MAX_ITEMS well-formed rows, best first. */
export function topItems(board) {
  const items = Array.isArray(board?.items) ? board.items : [];
  return items
    .filter(item => item && typeof item.displayName === 'string' && item.displayName !== '')
    .slice(0, SEO_MAX_ITEMS);
}

/** JSON for a <script> block: `<` is escaped so no value can close the tag. */
export function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/ | /g, '');
}

/**
 * The schema.org ItemList of the top models.
 * @param {SeoKind} kind
 * @param {Board} board
 * @param {string} origin
 */
export function itemListJsonLd(kind, board, origin) {
  const items = topItems(board);
  const rating = item => `Elo ${Math.round(item.eloScore)}, ${item.totalResponses} battles`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: kind === 'leaderboard' ? 'DualMind Arena leaderboard' : 'AI models in the DualMind Arena',
    url: `${origin}${PAGE_PATH[kind]}`,
    numberOfItems: items.length,
    itemListOrder: kind === 'leaderboard' ? 'https://schema.org/ItemListOrderDescending' : undefined,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.displayName,
      description:
        kind === 'leaderboard'
          ? `${item.providerName}, ${rating(item)}`
          : `${item.providerName}, ${item.totalResponses} battles`,
    })),
  };
}

/**
 * A <noscript> table of the top models, labelled "as of" the data's own time.
 * @param {SeoKind} kind
 * @param {Board} board
 */
export function noscriptTable(kind, board) {
  const items = topItems(board);
  const stamp = String(board?.meta?.generatedAt ?? '').slice(0, 10);
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? ` as of ${stamp}` : '';
  const cell = value => `<td>${escapeHtml(value)}</td>`;
  const rows = items
    .map(item =>
      kind === 'leaderboard'
        ? `<tr>${cell(item.eloRank)}${cell(item.displayName)}${cell(item.providerName)}${cell(Math.round(item.eloScore))}${cell(item.totalResponses)}${cell(`${item.winRate}%`)}</tr>`
        : `<tr>${cell(item.displayName)}${cell(item.providerName)}${cell(item.totalResponses)}</tr>`,
    )
    .join('');
  const head =
    kind === 'leaderboard'
      ? '<tr><th>Rank</th><th>Model</th><th>Provider</th><th>Elo</th><th>Battles</th><th>Win rate</th></tr>'
      : '<tr><th>Model</th><th>Provider</th><th>Battles</th></tr>';
  return (
    `<noscript data-seo-data><section aria-label="${PAGE_TITLE[kind]} snapshot">` +
    `<h2>${kind === 'leaderboard' ? 'Leaderboard' : 'Models'}${asOf}</h2>` +
    `<table><caption>Top ${items.length} models in the DualMind Arena${asOf}. ` +
    `Ratings come from blind human votes.</caption><thead>${head}</thead><tbody>${rows}</tbody></table>` +
    '</section></noscript>'
  );
}

/**
 * Writes the list and the table into the page. Without HTMLRewriter the page is returned as is.
 * @param {Response} response
 * @param {SeoKind} kind
 * @param {Board} board
 * @param {string} origin
 * @returns {Response}
 */
export function injectSeoData(response, kind, board, origin) {
  const Rewriter = /** @type {any} */ (globalThis).HTMLRewriter;
  if (typeof Rewriter !== 'function' || topItems(board).length === 0) return response;
  const jsonLd = `<script type="application/ld+json" data-seo-data>${jsonForScript(itemListJsonLd(kind, board, origin))}</script>`;
  const table = noscriptTable(kind, board);
  const out = new Rewriter()
    .on('head', {
      element(element) {
        element.append(jsonLd, { html: true });
      },
    })
    .on('body', {
      element(element) {
        element.append(table, { html: true });
      },
    })
    .transform(response);
  // The body changed: the file's ETag and length no longer describe it.
  out.headers.delete('etag');
  out.headers.delete('content-length');
  return out;
}

/**
 * The board from the leaderboard service (Cache API first), or null on any failure.
 * @param {Record<string, unknown>} env
 * @param {{ waitUntil?: (promise: Promise<unknown>) => void } | undefined} ctx
 * @param {string} requestUrl
 * @returns {Promise<Board | null>}
 */
export async function loadBoardFromService(env, ctx, requestUrl) {
  const { getLeaderboard } = await import('./v2/leaderboard/service.ts');
  const result = await getLeaderboard(env, ctx, crypto.randomUUID(), requestUrl);
  return /** @type {Board} */ (result.data);
}

/**
 * Adds the model data to a 200 HTML answer for /leaderboard/ or /models/. Fail-safe: any problem
 * returns the response untouched.
 * @param {Request} request
 * @param {Response} response
 * @param {{ env?: Record<string, unknown>, ctx?: { waitUntil?: (promise: Promise<unknown>) => void }, loadBoard?: () => Promise<Board | null>, timeoutMs?: number, log?: (event: object) => void }} [options]
 * @returns {Promise<Response>}
 */
export async function enrichSeoPage(request, response, options = {}) {
  const {
    env = {},
    ctx,
    timeoutMs = SEO_BOARD_TIMEOUT_MS,
    log = event => console.log(JSON.stringify(event)),
  } = options;
  try {
    if (request.method !== 'GET' || response.status !== 200) return response;
    if (typeof (/** @type {any} */ (globalThis).HTMLRewriter) !== 'function') return response;
    const url = new URL(request.url);
    const kind = seoKindFor(url.pathname);
    if (!kind || !(response.headers.get('content-type') || '').includes('text/html')) return response;

    const load = options.loadBoard ?? (() => loadBoardFromService(env, ctx, request.url));
    const pending = load();
    // A late failure after the timeout must not surface as an unhandled rejection.
    pending.catch(() => undefined);
    let timer;
    const board = await Promise.race([
      pending,
      new Promise(resolve => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]).finally(() => clearTimeout(timer));
    if (!board) {
      log({ event: 'seo_data_skipped', kind });
      return response;
    }
    return injectSeoData(response, kind, board, url.origin);
  } catch {
    return response;
  }
}
