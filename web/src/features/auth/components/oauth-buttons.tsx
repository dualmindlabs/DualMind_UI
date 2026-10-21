import { type ComponentType, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { authErrorMessage } from '@/lib/supabase';

import { GitHubMark, GoogleMark } from './provider-icons';

type Provider = 'google' | 'github';

const PROVIDERS: ReadonlyArray<{ id: Provider; label: string; Mark: ComponentType }> = [
  { id: 'google', label: 'Google', Mark: GoogleMark },
  { id: 'github', label: 'GitHub', Mark: GitHubMark },
];

/**
 * "Continue with Google / GitHub". Supabase sends the browser to the provider, which returns to
 * the bare origin `/` (unchanged from the legacy pages, so the Supabase redirect allow-list needs
 * nothing new); the landing page hands the returning tokens to the arena.
 */
export function OAuthButtons({
  onError,
  disabled = false,
}: {
  onError: (message: string | null) => void;
  disabled?: boolean;
}) {
  const { client } = useAuth();
  const [pending, setPending] = useState<Provider | null>(null);

  const start = async (provider: Provider) => {
    onError(null);
    setPending(provider);
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
