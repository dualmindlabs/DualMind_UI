import { index, route, type RouteConfig } from '@react-router/dev/routes';

/**
 * The explicit route table: every URL this app serves, mapped to a thin route module in
 * src/app/routes/. Paths are the exact public URLs, so legacy links keep working as pages move here.
 * Prerendered paths are listed in react-router.config.ts; the rest of the site is still served by
 * the legacy files in the repo root until their slice lands (docs/redesign/migration-plan.md).
 */
export default [
  // The landing page (signed out); signed-in visitors get the arena (S8, S9), loaded lazily.
  index('routes/home.tsx'),
  // Living style guide (noindex).
  route('design', 'routes/design.tsx'),
  // Live rankings and the model directory (slice S7), from the public model-stats API.
  route('leaderboard', 'routes/leaderboard.tsx'),
  route('models', 'routes/models.tsx'),

  // Info and legal pages (slice S4).
  route('about', 'routes/about.tsx'),
  route('credits', 'routes/credits.tsx'),
  route('how-it-works', 'routes/how-it-works.tsx'),
  route('faq', 'routes/faq.tsx'),
  route('privacy', 'routes/privacy.tsx'),
  route('terms', 'routes/terms.tsx'),
  route('cookies', 'routes/cookies.tsx'),

  // The API reference (BE-5), built from docs/api/openapi.v2.json at build time.
  route('developers', 'routes/developers.tsx'),

  // Sign-in (slice S6): clean canonical paths, prerendered; the old .html URLs 301 here
  // (server/redirects.js).
  route('login', 'routes/login.tsx'),
  route('signup', 'routes/signup.tsx'),
  route('forgot-password', 'routes/forgot-password.tsx'),
  // Supabase email targets at their exact legacy addresses: client-only (SPA fallback, status 200;
  // SPA_FALLBACK_ROUTES in server/routing.js), never redirected.
  route('update-password.html', 'routes/update-password.tsx'),
  route('auth-callback.html', 'routes/auth-callback.tsx'),

  // Shared battles and chats (slice S11): /share/<id> and the old /share/?id=<id> forms, also under
  // /share/index.html. Client-only (SPA fallback, status 200, no-store, link-preview tags written by
  // the Worker; server/share.js).
  route('share/:threadId?', 'routes/share.tsx'),

  // Settings and export (slice S12): signed in only, so client-only (SPA fallback, status 200,
  // noindex; SPA_FALLBACK_ROUTES and isNoindexPath in server/routing.js). Signed-out visitors go
  // to /login/?redirect=%2Fsettings%2F (hooks/use-require-auth.ts).
  route('settings', 'routes/settings.tsx'),

  // Anything else: the 404 page. Prerendered as /404 (build.js moves it to dist/404.html, which
  // the Worker serves with status 404); this entry also covers client-side navigation.
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig;
