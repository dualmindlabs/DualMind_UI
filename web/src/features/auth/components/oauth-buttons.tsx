import { type ComponentType, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { saveAuthHandoff } from '@/lib/session/auth-handoff';
import { authErrorMessage } from '@/lib/supabase';
import { copyText } from '@/lib/utils/clipboard';
import { detectInAppBrowser } from '@/lib/utils/in-app-browser';

import { useRedirectTarget } from '../hooks/use-redirect-target';

import { GitHubMark, GoogleMark } from './provider-icons';

type Provider = 'google' | 'github';

const PROVIDERS: ReadonlyArray<{ id: Provider; label: string; Mark: ComponentType }> = [
  { id: 'google', label: 'Google', Mark: GoogleMark },
  { id: 'github', label: 'GitHub', Mark: GitHubMark },
];

/**
 * Google refuses sign-in inside the in-app browsers of LinkedIn, Instagram, Facebook and the like.
 * Says so before the visitor hits the error page, with a button to copy this page's link.
 */
function InAppBrowserNotice({ browser }: { browser: string }) {
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null);
  return (
    <div
      role="note"
      data-testid="in-app-browser-notice"
      className="grid gap-2 rounded-lg border border-warn/50 px-4 py-3 text-ui-sm text-fg-soft"
    >
      <p>
        <strong className="font-medium text-fg">Open this page in your browser to use Google.</strong>{' '}
        Google does not allow sign-in inside {browser}. Use GitHub or an email code here, or copy the
        link and paste it into Safari or Chrome.
      </p>
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() =>
          void copyText(window.location.href).then(ok => setCopied(ok ? 'copied' : 'failed'))
        }
      >
        Copy link
      </Button>
      <p role="status" className="text-caption text-muted">
        {copied === 'copied' ? 'Link copied.' : null}
        {copied === 'failed' ? 'Could not copy. Select the address and copy it yourself.' : null}
      </p>
    </div>
  );
}

/**
 * "Continue with Google / GitHub". Supabase sends the browser to the provider, which returns to
 * the bare origin `/` (unchanged from the legacy pages, so the Supabase redirect allow-list needs
 * nothing new); the landing page hands the returning tokens to the arena. Before leaving, the
 * prompt draft and the wanted page (`?redirect=`) are kept (lib/session/auth-handoff.ts), and the
 * arena claims them on return, so neither is lost to the round trip.
 */
export function OAuthButtons({
  onError,
  disabled = false,
}: {
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const { client } = useAuth();
  const target = useRedirectTarget();
  const [pending, setPending] = useState<Provider | null>(null);
  // The user agent is only known in the browser; the first render matches the prerendered HTML.
  const [inApp, setInApp] = useState<string | null>(null);
  useEffect(() => setInApp(detectInAppBrowser(navigator.userAgent)), []);

  const start = async (provider: Provider) => {
    onError(null);
    setPending(provider);
    saveAuthHandoff(target);
    try {
      const supabase = await client();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      // The browser is leaving for the provider; keep the spinner until it does.
    } catch (error) {
      onError(authErrorMessage(error));
      setPending(null);
    }
  };

  return (
    <div className="grid gap-3">
      {inApp === null ? null : <InAppBrowserNotice browser={inApp} />}
      {PROVIDERS.map(({ id, label, Mark }) => (
        <Button
          key={id}
          variant="secondary"
          className="w-full"
          loading={pending === id}
          disabled={disabled || (pending !== null && pending !== id)}
          onClick={() => void start(id)}
        >
          <Mark />
          Continue with {label}
        </Button>
      ))}
    </div>
  );
}

/** "or" between the provider buttons and the form. */
export function OrDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-caption text-muted">
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span>{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
