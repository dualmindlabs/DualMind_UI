# 0006. Same-origin /api through a hardened Worker proxy

- Status: Accepted; implemented in the Worker hygiene PR (S1b)
- Date: 2026-10-20
- Deciders: @harshbhx

## Context

The legacy app calls `api.dualmindlab.tech` cross-origin. The Worker already proxies `/api/*` to the backend, but it forwards every request header, answers with `Access-Control-Allow-Origin: *`, adds `x-dualmind-proxy-*` debug headers and returns `error.toString()` on failures. A strict Content-Security-Policy needs as few origins as possible.

## Decision

- The new app calls **same-origin `/api/*`** only; the Worker proxies it to the backend.
- The proxy (`server/api-proxy.js`, slice S1b) is hardened and tested against a fake upstream:
  - forwards only `Authorization`, `Content-Type`, `Accept`, `Accept-Language` and `X-Request-Id`;
  - every request carries an id: the caller's `X-Request-Id` if it is 8-128 characters of `[A-Za-z0-9._:-]`, otherwise a new UUID; it goes to the backend and is echoed on the response;
  - no CORS: the Worker sends no `Access-Control-*` headers, strips the backend's, and no longer answers every `OPTIONS` with a 204 (`OPTIONS /api/*` is proxied like other methods);
  - no `x-dualmind-proxy-*` headers;
  - upstream failure: `502 {"error":"bad_gateway","requestId"}`; no response within 30 s: `504 {"error":"gateway_timeout","requestId"}`; no error details;
  - bodies stream straight through; a `text/event-stream` response is never cut once it has started, other bodies must finish within the 30 s;
  - `/api/health` still maps to the backend's `/health`.
- The typed client (`web/src/lib/api/`, slice S5) owns schemas, errors and request ids; `POST` battle and chat calls are never retried automatically.

## Consequences

- No CORS for the app's own calls; the backend origin stays an implementation detail.
- The CSP can use `connect-src 'self'` plus the Supabase origin.
- The Worker is on the request path for every API call, so its proxy code needs the same test coverage as the backend contract.

If a cross-origin caller ever needs the proxy, it gets an explicit origin allow-list in `server/api-proxy.js`, never `*`.

## Alternatives considered

- **Keep cross-origin calls:** CORS configuration on the backend, a wider CSP, and the backend origin exposed in the bundle.
- **A separate API Worker or route:** more moving parts for the same effect.
