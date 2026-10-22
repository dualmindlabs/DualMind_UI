import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@/styles/app.css';

import geistLatin from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url';
import geistMonoLatin from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2?url';
import { type ReactNode, useEffect } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from 'react-router';

import { AppProviders } from '@/components/layout/app-providers';
import { SessionHandoffScript } from '@/components/layout/session-handoff-script';
import { ThemeScript } from '@/components/layout/theme-script';
import { Wordmark } from '@/components/layout/wordmark';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isChunkLoadError } from '@/lib/network/chunk-error';
import { reloadWhenOnline } from '@/lib/network/reload-when-online';
import { wantsSessionHandoff } from '@/lib/session/handoff';
import { applyThemePreference, readThemePreference } from '@/lib/theme/theme';
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
 * The last-resort screen, for what no nearer boundary caught. A dropped network (or a code chunk
 * that never arrived) is not "something went wrong": it says so, keeps the way back one tap
 * away, and reloads once by itself when the connection returns. Pages with a nearer boundary
 * (the arena has its own, in place) rarely get here.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const online = useOnlineStatus();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const offline = !online && !notFound;
  const chunk = isChunkLoadError(error);
  const recoverable = (offline || chunk) && !notFound;

  // When the error comes up during hydration, React renders the document again on the client
  // and the data-theme the head script put on <html> is lost, so a dark-theme visitor got a
  // light error screen. Apply the stored theme again.
  useEffect(() => {
    applyThemePreference(readThemePreference());
  }, []);

  useEffect(() => {
    if (!recoverable) return;
    return reloadWhenOnline();
  }, [recoverable]);

  const lead = notFound ? '404. ' : offline ? '' : chunk ? 'Update. ' : 'Error. ';
  const title = notFound
    ? 'This page does not exist.'
    : offline
      ? 'You are offline.'
      : chunk
        ? 'A newer version is available.'
        : 'Something went wrong.';
  const detail =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : notFound
        ? 'Check the address, or go back to the Arena.'
        : offline
          ? 'Your drafts and votes are kept on this device. This page reloads by itself when you are back online.'
          : chunk
            ? 'Part of the page could not load. Reload to get the latest version.'
            : 'Try again, or reload the page.';

  return (
    <main
      className="mx-auto grid min-h-svh max-w-page content-center gap-6 px-4 sm:px-6"
      data-testid="root-error"
      data-kind={notFound ? 'not-found' : offline ? 'offline' : chunk ? 'chunk' : 'error'}
    >
      <Wordmark className="h-4" />
      <h1 className="text-h1 font-medium">
        {lead}
        <span className="human-voice text-human">{title}</span>
      </h1>
      <p className="max-w-reading text-fg-soft" role="status">
        {detail}
      </p>
      <p className="flex flex-wrap items-center gap-4">
        {notFound ? null : <Button onClick={() => window.location.reload()}>Try again</Button>}
        <a className="text-mind-a underline underline-offset-4" href="/">
          Back to DualMind Arena
        </a>
      </p>
    </main>
  );
}
