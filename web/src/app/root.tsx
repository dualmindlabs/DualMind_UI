import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import '@/styles/app.css';

import bricolageLatin from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-opsz-normal.woff2?url';
import dmMonoLatin from '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2?url';
import type { ReactNode } from 'react';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import { ThemeScript } from '@/components/layout/theme-script';
import { Wordmark } from '@/components/layout/wordmark';
import { backgrounds } from '@/styles/tokens';

import type { Route } from './+types/root';

export const links: Route.LinksFunction = () => [
  // The two files every page needs above the fold: body text and labels.
  { rel: 'preload', href: bricolageLatin, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'preload', href: dmMonoLatin, as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
  { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    // The theme script sets data-theme on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="dark light" />
        <meta
          name="theme-color"
          content={backgrounds.dark}
          media="(prefers-color-scheme: dark)"
        />
        <meta
          name="theme-color"
          content={backgrounds.light}
          media="(prefers-color-scheme: light)"
        />
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
  return <Outlet />;
}

/** Shown by the SPA fallback page (dist/__spa-fallback.html) until the route's code loads. */
export function HydrateFallback() {
  return (
    <div className="grid min-h-svh place-items-center bg-bg-deep" aria-busy="true" data-spa-fallback>
      <p className="flex flex-col items-center gap-4">
        <Wordmark className="text-ui" />
        <span className="eyebrow text-muted">Loading</span>
      </p>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const title = notFound ? 'This page does not exist.' : 'Something went wrong.';
  const detail =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : notFound
        ? 'Check the address, or go back to the Arena.'
        : 'Reload the page to try again.';

  return (
    <main className="mx-auto grid min-h-svh max-w-page content-center gap-6 px-4 sm:px-6">
      <Wordmark className="text-ui" />
      <h1 className="text-h1 font-medium">
        {notFound ? '404. ' : 'Error. '}
        <span className="human-voice text-human">{title}</span>
      </h1>
      <p className="max-w-reading text-fg-soft">{detail}</p>
      <p>
        <a className="text-mind-a underline underline-offset-4" href="/">
          Back to DualMind Arena
        </a>
      </p>
    </main>
  );
}
