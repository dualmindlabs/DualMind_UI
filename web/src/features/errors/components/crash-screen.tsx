/**
 * The last-resort screen of the root error boundary (app/root.tsx): what no nearer boundary
 * caught. It renders outside the app providers (no router-aware header, no command palette), so
 * it stands alone: wordmark, a duel glyph for the kind of failure, one clear sentence and the way
 * back. A dropped network (or a code chunk that never arrived) is not "something went wrong": it
 * says so and reloads once by itself when the connection returns.
 */
import { RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { isRouteErrorResponse } from 'react-router';

import { Wordmark } from '@/components/layout/wordmark';
import { Button, buttonVariants } from '@/components/ui/button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isChunkLoadError } from '@/lib/network/chunk-error';
import { reloadWhenOnline } from '@/lib/network/reload-when-online';
import { applyThemePreference, readThemePreference } from '@/lib/theme/theme';

import { DuelGlyph, type DuelGlyphState } from './duel-glyph';

type Kind = 'not-found' | 'offline' | 'chunk' | 'error';

const copy: Record<Kind, { code: string; title: string; detail: string; glyph: DuelGlyphState }> = {
  'not-found': {
    code: 'Error 404',
    title: 'This page does not exist.',
    detail: 'Check the address, or go back to the Arena.',
    glyph: 'miss',
  },
  offline: {
    code: 'Offline',
    title: 'You are offline.',
    detail:
      'Your drafts and votes are kept on this device. This page reloads by itself when you are back online.',
    glyph: 'offline',
  },
  chunk: {
    code: 'Update',
    title: 'A newer version is available.',
    detail: 'Part of the page could not load. Reload to get the latest version.',
    glyph: 'update',
  },
  error: {
    code: 'Error',
    title: 'Something went wrong.',
    detail: 'Try again, or reload the page.',
    glyph: 'crash',
  },
};

export function CrashScreen({ error }: { error: unknown }) {
  const online = useOnlineStatus();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const offline = !online && !notFound;
  const chunk = isChunkLoadError(error);
  const recoverable = (offline || chunk) && !notFound;
  const kind: Kind = notFound ? 'not-found' : offline ? 'offline' : chunk ? 'chunk' : 'error';
  const text = copy[kind];

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

  const detail = import.meta.env.DEV && error instanceof Error ? error.message : text.detail;

  return (
    <main
      className="relative isolate grid min-h-svh content-center overflow-hidden mesh-duel px-4 py-16 sm:px-6"
      data-testid="root-error"
      data-kind={kind}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-grid" />
      <div className="mx-auto grid w-full max-w-xl gap-8">
        <a href="/" aria-label="DualMind Arena, home" className="w-fit rounded-sm">
          <Wordmark className="h-4" />
        </a>

        <section
          data-slot="crash-card"
          className="surface-duel grid gap-7 p-6 sm:p-9"
          aria-labelledby="crash-title"
        >
          <DuelGlyph state={text.glyph} className="max-w-sm" />
          <div className="grid gap-3">
            <Eyebrow tone={kind === 'error' ? 'human' : kind === 'offline' ? 'b' : 'a'}>
              {text.code}
            </Eyebrow>
            <h1 id="crash-title" className="text-h1 text-balance text-fg">
              {text.title}
            </h1>
            <p
              role="status"
              className={
                import.meta.env.DEV && error instanceof Error
                  ? 'max-w-reading font-mono text-caption break-words text-fg-soft'
                  : 'max-w-reading text-body text-fg-soft'
              }
            >
              {detail}
            </p>
          </div>

          {offline ? (
            <p className="flex items-center gap-2.5 text-ui-sm text-fg-soft">
              <span
                aria-hidden="true"
                className="glyph-pulse size-2 rounded-full bg-mind-b"
                data-testid="reconnecting-dot"
              />
              Waiting for the connection
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {notFound ? null : (
              <Button size="md" onClick={() => window.location.reload()}>
                <RefreshCw aria-hidden="true" strokeWidth={1.75} />
                Try again
              </Button>
            )}
            <a
              href="/"
              className={buttonVariants({ variant: notFound ? 'primary' : 'outline', size: 'md' })}
            >
              Back to DualMind Arena
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
