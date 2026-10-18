import { useEffect, useRef, useState, type FormEvent } from 'react';
import { joinWaitlist } from '@/lib/waitlist';
import { useHydrated, useReducedMotion } from '@/lib/media';
import { cn } from '@/lib/cn';
import Magnet from './reactbits/Magnet';
import { BorderBeam } from './magicui/border-beam';
import { Alert, ArrowRight, Check, Info, Spinner } from './icons';

export const EMAIL_INPUT_ID = 'email';

type FormState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'invalid' }
  | { kind: 'duplicate'; email: string }
  | { kind: 'error' }
  | { kind: 'joined'; email: string };

const HINT = 'Launch updates only. No spam, unsubscribe anytime.';

export function SignupForm({ refCode }: { refCode: string | null }) {
  const [state, setState] = useState<FormState>({ kind: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef<HTMLParagraphElement>(null);
  const hydrated = useHydrated();
  const reduced = useReducedMotion();

  const joined = state.kind === 'joined';
  const pending = state.kind === 'pending';

  useEffect(() => {
    if (joined) doneRef.current?.focus();
  }, [joined]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = inputRef.current;
    if (!input) return;
    const email = input.value.trim();
    // Same check as before: the browser's own email validation on a required field.
    if (!email || !input.checkValidity()) {
      setState({ kind: 'invalid' });
      input.focus();
      return;
    }
    setState({ kind: 'pending' });
    const outcome = await joinWaitlist(email, refCode);
    if (outcome === 'joined') {
      input.value = '';
      setState({ kind: 'joined', email: email.toLowerCase() });
    } else if (outcome === 'duplicate') {
      setState({ kind: 'duplicate', email: email.toLowerCase() });
    } else {
      setState({ kind: 'error' });
    }
  }

  function reset() {
    setState({ kind: 'idle' });
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const tone =
    state.kind === 'invalid' || state.kind === 'error'
      ? 'bad'
      : state.kind === 'duplicate'
        ? 'info'
        : 'quiet';

  return (
    <div className="w-full max-w-[620px]" data-state={state.kind}>
      <div
        className={cn(
          'relative rounded-[22px] border bg-surface/75 p-2.5 shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)] backdrop-blur-md transition-colors duration-300 sm:p-3',
          tone === 'bad' ? 'border-bad/50' : joined ? 'border-ok/40' : 'border-line',
        )}
      >
        {hydrated && !reduced && (
          <BorderBeam size={140} duration={9} colorFrom="#00D9FF" colorTo="#8B5CF6" borderWidth={1.5} />
        )}

        {joined ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-4" data-testid="signup-success">
            <span className="grid size-11 flex-none place-items-center rounded-full bg-ok/12 text-ok ring-1 ring-ok/40">
              <Check className="size-5" />
            </span>
            <div className="min-w-0">
              <p ref={doneRef} tabIndex={-1} className="text-lg font-medium tracking-[-0.01em] text-fg outline-none">
                You're on the list.
              </p>
              <p className="mt-0.5 text-[15px] leading-snug text-fg-soft">
                We'll be in touch at <span className="break-all text-fg">{state.email}</span>. Meanwhile, try a battle
                below.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="link-sweep col-start-2 justify-self-start font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:col-start-3"
            >
              Add another
            </button>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-2.5 sm:flex-row">
            <label htmlFor={EMAIL_INPUT_ID} className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id={EMAIL_INPUT_ID}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="you@company.com"
              aria-invalid={state.kind === 'invalid' || undefined}
              aria-describedby="signup-status"
              readOnly={pending}
              onChange={() => {
                if (state.kind !== 'idle' && state.kind !== 'pending') setState({ kind: 'idle' });
              }}
              className={cn(
                'h-14 w-full min-w-0 rounded-[14px] sm:w-auto sm:flex-1 border bg-ink/80 px-5 text-base text-fg placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200',
                'focus:outline-none focus-visible:outline-none focus:ring-4',
                state.kind === 'invalid'
                  ? 'border-bad/70 focus:border-bad focus:ring-bad/15'
                  : 'border-line-soft focus:border-cyan/60 focus:ring-cyan/10',
                pending && 'opacity-70',
              )}
            />
            <Magnet
              padding={60}
              magnetStrength={4}
              maxOffset={8}
              disabled={pending}
              style={{ display: 'block' }}
              innerClassName="w-full"
            >
              <button type="submit" className="cta w-full sm:w-auto" disabled={pending} aria-busy={pending || undefined}>
                <span>{pending ? 'Joining…' : 'Join the waitlist'}</span>
                <span className="cta-chip" aria-hidden="true">
                  {pending ? (
                    <Spinner className="animate-[spin_0.9s_linear_infinite]" />
                  ) : (
                    <>
                      <ArrowRight />
                      <ArrowRight />
                    </>
                  )}
                </span>
              </button>
            </Magnet>
          </form>
        )}
      </div>

      <p
        id="signup-status"
        role="status"
        aria-live="polite"
        className={cn(
          'mt-3.5 flex min-h-6 items-start gap-2 px-1 text-[14px] leading-snug',
          tone === 'bad' ? 'text-bad' : tone === 'info' ? 'text-cyan' : 'text-muted',
        )}
      >
        {state.kind === 'invalid' && (
          <>
            <Alert className="mt-px size-4 flex-none" />
            Enter a valid email address, like name@example.com.
          </>
        )}
        {state.kind === 'error' && (
          <>
            <Alert className="mt-px size-4 flex-none" />
            We couldn't save your spot just now. Please try again in a moment.
          </>
        )}
        {state.kind === 'duplicate' && (
          <>
            <Info className="mt-px size-4 flex-none" />
            <span>
              <span className="break-all">{state.email}</span> is already on the list. Nothing more to do.
            </span>
          </>
        )}
        {state.kind === 'pending' && <span className="sr-only">Saving your spot…</span>}
        {(state.kind === 'idle' || state.kind === 'pending') && <span aria-hidden={pending || undefined}>{HINT}</span>}
      </p>
    </div>
  );
}
