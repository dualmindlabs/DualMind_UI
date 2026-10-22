import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@/styles/app.css';

import geistLatin from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import geistMonoLatin from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
import type { ReactNode } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useMatches } from 'react-router';

import { AppProviders } from '@/components/layout/app-providers';
import { SessionHandoffScript } from '@/components/layout/session-handoff-script';
import { ThemeScript } from '@/components/layout/theme-script';
import { Wordmark } from '@/components/layout/wordmark';
import { CrashScreen } from '@/features/info/components/crash-screen';
import { wantsSessionHandoff } from '@/lib/session/handoff';
import { backgrounds } from '@/styles/tokens';

import type { Route } from './+types/root';

export const links: Route.LinksFunction = () => [
  // The two files every page needs above the fold: Geist (display, UI and body: one variable file
  // for every weight) and Geist Mono (numbers and labels).
  {
    rel: 'preload',
    href: geistLatin,
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    href: geistMonoLatin,
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
  },
  // Icons (web/public): the 32 px .ico for browsers and tools without SVG favicons, the SVG for
  // the rest, the 180 px PNG for iOS home screens, and the web app manifest with the 192 and 512
  // px icons (plus a maskable one) for Android and installed apps. The manifest is fetched with
  // credentials: browsers fetch it without cookies by default, and while the waitlist gate is on
  // (worker.js) a request without the preview cookie is redirected away.
  { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest', crossOrigin: 'use-credentials' },
];

export function Layout({ children }: { children: ReactNode }) {
  // The landing page (`/`) sends signed-in visitors to the legacy arena before the first paint,
  // until the arena slice renders it here (lib/session/handoff.ts).
  const handoff = useMatches().some(match => wantsSessionHandoff(match.handle));

  return (
    // The theme script sets data-theme on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="color-scheme" content="dark light" />
        <meta name="application-name" content="DualMind Arena" />
        <meta name="apple-mobile-web-app-title" content="DualMind" />
        <meta name="theme-color" content={backgrounds.dark} media="(prefers-color-scheme: dark)" />
        <meta
          name="theme-color"
          content={backgrounds.light}
          media="(prefers-color-scheme: light)"
        />
        {handoff ? <SessionHandoffScript /> : null}
        <ThemeScript />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}

/** Shown by the SPA fallback page (dist/__spa-fallback.html) until the route's code loads. */
export function HydrateFallback() {
  return (
    <div
      className="grid min-h-svh place-items-center bg-bg-deep"
      aria-busy="true"
      data-spa-fallback
    >
      <p className="flex flex-col items-center gap-4">
        <Wordmark className="h-4" />
        <span className="eyebrow text-muted">Loading</span>
      </p>
    </div>
  );
}

/**
 * The last-resort screen, for what no nearer boundary caught. Pages with a nearer boundary (the
 * arena has its own, in place) rarely get here. The screen itself lives in the info feature.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <CrashScreen error={error} />;
}
