import { EMAIL_INPUT_ID } from './SignupForm';
import Magnet from './reactbits/Magnet';
import { ArrowUp } from './icons';

/** Sends people back to the one form on the page instead of duplicating it. */
function focusSignup() {
  const input = document.getElementById(EMAIL_INPUT_ID);
  const target = input ?? document.querySelector('[data-testid="signup-success"]');
  if (!target) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  if (input) input.focus({ preventScroll: true });
}

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-title" className="relative isolate overflow-hidden border-t border-line-soft">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_20%_100%,rgb(0_217_255/0.10),transparent_70%),radial-gradient(50%_70%_at_85%_100%,rgb(139_92_246/0.12),transparent_70%)]"
      />
      <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-10 px-4 py-24 sm:px-8 sm:py-32 md:flex-row md:items-end md:justify-between">
        <h2
          id="closing-title"
          className="max-w-[15ch] text-[clamp(2.4rem,5.6vw,4.75rem)] leading-[0.98] font-light tracking-[-0.04em] text-fg"
        >
          Be there <span className="human">at launch.</span>
        </h2>
        <div className="flex flex-col items-start gap-4">
          <Magnet padding={70} magnetStrength={4} maxOffset={10}>
            <button type="button" className="cta" onClick={focusSignup}>
              <span>Join the waitlist</span>
              <span className="cta-chip" aria-hidden="true">
                <ArrowUp />
                <ArrowUp />
              </span>
            </button>
          </Magnet>
          <p className="font-mono text-[11px] tracking-[0.06em] text-muted">One field. Takes five seconds.</p>
        </div>
      </div>
    </section>
  );
}
