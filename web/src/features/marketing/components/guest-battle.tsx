import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/hooks/use-api-client';
import { useFeatures } from '@/hooks/use-features';
import {
  type Battle,
  getUserMessage,
  GUEST_PROMPT_MAX_CHARS,
  isApiError,
  isApiErrorKind,
} from '@/lib/api';
import { savePromptDraft } from '@/lib/session/prompt-draft';
import { SIGNUP_PATH } from '@/lib/supabase';
import { renderTurnstile, type TurnstileHandle } from '@/lib/turnstile';

type Phase =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'done'; battle: Battle; prompt: string }
  | { kind: 'error'; message: string };

/** What the visitor reads for a failed guest battle. */
export function guestBattleMessage(error: unknown): string {
  if (isApiError(error) && error.code === 'TURNSTILE_FAILED') {
    return 'The check did not pass. Try again.';
  }
  if (isApiErrorKind(error, 'rate_limited')) {
    return 'You have used today’s free battle. Create a free account to keep going.';
  }
  if (isApiErrorKind(error, 'not_found')) {
    return 'The free battle is not available right now. Create an account to run battles.';
  }
  return getUserMessage(error);
}

/** The sign-up page, with the prompt kept for the arena (the draft is read once after sign-in). */
export const GUEST_SIGNUP_HREF = `${SIGNUP_PATH}?redirect=${encodeURIComponent('/')}`;

/**
 * "Try one battle without an account" (flag off by default). One prompt of up to 500 characters,
 * a Cloudflare Turnstile check, two anonymous answers. Voting is for accounts: after the answers
 * the page asks the visitor to sign up for the vote and the reveal. No model name is ever shown
 * here, even if the API sends one.
 */
export function GuestBattle({
  navigate = href => window.location.assign(href),
}: {
  /** Leaves for the sign-up page with a full page load; a test passes a spy. */
  navigate?: (href: string) => void;
}) {
  const features = useFeatures();
  const api = useApiClient();
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [armed, setArmed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const widget = useRef<HTMLDivElement>(null);
  const handle = useRef<TurnstileHandle | null>(null);
  const inputId = useId();
  const statusId = useId();
  const siteKey = features.turnstileSiteKey;

  // The check loads only once the visitor shows interest (focus), and only when the feature is on.
  useEffect(() => {
    if (!features.guestBattle || !armed || !siteKey || !widget.current) return undefined;
    let cancelled = false;
    void renderTurnstile(widget.current, siteKey, setToken)
      .then(created => {
        if (cancelled) created.remove();
        else handle.current = created;
      })
      .catch(() =>
        setPhase({
          kind: 'error',
          message: 'The check could not load. Allow challenges.cloudflare.com, or sign up instead.',
        }),
      );
    return () => {
      cancelled = true;
      handle.current?.remove();
      handle.current = null;
    };
  }, [features.guestBattle, armed, siteKey]);

  if (!features.guestBattle) return null;

  const trimmed = prompt.trim();
  const running = phase.kind === 'running';
  const canRun = trimmed !== '' && token !== null && !running;

  const run = async () => {
    if (!canRun || token === null) return;
    setPhase({ kind: 'running' });
    try {
      const battle = await api.startGuestBattle({ prompt: trimmed, turnstileToken: token });
      setPhase({ kind: 'done', battle, prompt: trimmed });
    } catch (error) {
      setPhase({ kind: 'error', message: guestBattleMessage(error) });
    } finally {
      // A Turnstile token works once.
      setToken(null);
      handle.current?.reset();
    }
  };

  const signUp = () => {
    if (phase.kind === 'done') savePromptDraft(phase.prompt);
    navigate(GUEST_SIGNUP_HREF);
  };

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      data-testid="guest-battle"
      className="mx-auto max-w-page px-4 py-16 sm:px-6"
    >
      <div className="surface-duel mx-auto grid max-w-3xl gap-5 p-6 sm:p-8">
        <div className="grid gap-1.5">
          <h2 id={`${inputId}-title`} className="text-h3 text-fg">
            Try one battle, no account
          </h2>
          <p className="text-ui-sm text-fg-soft">
            Ask one question and read two anonymous answers. Voting and the reveal of the models
            are for accounts, and a free account takes a minute.
          </p>
        </div>

        {phase.kind === 'done' ? (
          <div className="grid gap-4" data-testid="guest-battle-result">
            <p className="text-ui-sm text-muted">
              Your prompt: <span dir="auto">“{phase.prompt}”</span>
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ['A', phase.battle.agent1.text],
                  ['B', phase.battle.agent2.text],
                ] as const
              ).map(([label, text]) => (
                <article
                  key={label}
                  aria-label={`Answer ${label}`}
                  className="grid content-start gap-2 rounded-lg border border-line bg-surface p-4"
                >
                  <h3 className="text-caption font-semibold text-fg-soft">Answer {label}</h3>
                  <p dir="auto" className="text-ui-sm break-words whitespace-pre-wrap text-fg">
                    {text}
                  </p>
                </article>
              ))}
            </div>
            <div className="grid gap-3 rounded-lg border border-human/40 bg-human-tint p-4">
              <p className="text-ui-sm text-fg">
                Which one was better? Create a free account to vote and see which models wrote them.
              </p>
              <Button className="w-fit" onClick={signUp}>
                Sign up to vote and reveal
              </Button>
            </div>
          </div>
        ) : (
          <form
            noValidate
            onSubmit={event => {
              event.preventDefault();
              void run();
            }}
            className="grid gap-4"
          >
            <label htmlFor={inputId} className="sr-only">
              Your prompt for the free battle
            </label>
            <Textarea
              id={inputId}
              rows={3}
              maxLength={GUEST_PROMPT_MAX_CHARS}
              value={prompt}
              disabled={running}
              placeholder="Ask anything, in up to 500 characters"
              aria-describedby={statusId}
              onFocus={() => setArmed(true)}
              onChange={event => setPrompt(event.target.value)}
            />
            <div ref={widget} data-testid="guest-turnstile" />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={running} disabled={!canRun}>
                Run the battle
              </Button>
              <span className="text-caption text-muted" aria-hidden="true">
                {prompt.length} / {GUEST_PROMPT_MAX_CHARS}
              </span>
            </div>
            <p
              id={statusId}
              role="status"
              data-testid="guest-battle-status"
              className="min-h-5 text-ui-sm text-fg-soft"
            >
              {phase.kind === 'error'
                ? phase.message
                : running
                  ? 'Asking two models.'
                  : 'No models are named until you have an account and vote.'}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
