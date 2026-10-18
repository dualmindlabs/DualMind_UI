import { useEffect, useRef, useState } from 'react';
import { DEMO_DISCLOSURE, DEMO_PROMPTS, RESULT_MESSAGES, STREAM_CPS, type VoteChoice } from '@/content/demo';
import { useReducedMotion } from '@/lib/media';
import { cn } from '@/lib/cn';
import DecryptedText from './reactbits/DecryptedText';
import { ArrowRight } from './icons';
import { SectionHeading } from './SectionHeading';

type Side = 'a' | 'b';

const SIDES: Record<Side, { label: string; dot: string; ring: string; tint: string }> = {
  a: { label: 'Model A', dot: 'bg-cyan', ring: 'ring-cyan/60', tint: 'text-cyan' },
  b: { label: 'Model B', dot: 'bg-violet', ring: 'ring-violet/70', tint: 'text-violet-text' },
};

const CHOICES: { id: VoteChoice; label: string }[] = [
  { id: 'a', label: 'A is better' },
  { id: 'tie', label: 'It’s a tie' },
  { id: 'both-bad', label: 'Both are bad' },
  { id: 'b', label: 'B is better' },
];

/**
 * A hands-on battle, the way the Arena runs one: a prompt, two anonymous answers streaming in side
 * by side, a vote, then the reveal. The answers are labelled as written for the demo.
 */
export function BattleDemo() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [vote, setVote] = useState<VoteChoice | null>(null);
  // Characters shown per answer. Infinity (the server render and reduced motion) shows everything.
  const [shown, setShown] = useState(Number.POSITIVE_INFINITY);
  const [streaming, setStreaming] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const votesRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const rafRef = useRef(0);

  const prompt = DEMO_PROMPTS[index];
  const answers: Record<Side, string> = {
    a: prompt.crispSide === 'a' ? prompt.crisp : prompt.padded,
    b: prompt.crispSide === 'b' ? prompt.crisp : prompt.padded,
  };
  const longest = Math.max(answers.a.length, answers.b.length);

  // Stream both answers once the panel is on screen, and again for each new prompt.
  useEffect(() => {
    if (reduced) {
      setShown(Number.POSITIVE_INFINITY);
      setStreaming(false);
      return undefined;
    }
    const panel = panelRef.current;
    if (!panel) return undefined;
    const run = () => {
      const start = performance.now();
      setStreaming(true);
      setShown(0);
      const tick = (now: number) => {
        const count = Math.floor(((now - start) / 1000) * STREAM_CPS);
        if (count >= longest) {
          setShown(Number.POSITIVE_INFINITY);
          setStreaming(false);
          return;
        }
        setShown(count);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };
    if (started.current) {
      run();
      return () => cancelAnimationFrame(rafRef.current);
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          observer.disconnect();
          started.current = true;
          run();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(panel);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [index, reduced, longest]);

  function cast(choice: VoteChoice) {
    cancelAnimationFrame(rafRef.current);
    setVote(choice);
    setShown(Number.POSITIVE_INFINITY);
    setStreaming(false);
    requestAnimationFrame(() => resultRef.current?.focus());
  }

  function next() {
    setVote(null);
    setIndex(current => (current + 1) % DEMO_PROMPTS.length);
    requestAnimationFrame(() => votesRef.current?.querySelector('button')?.focus());
  }

  const result =
    vote === 'tie' || vote === 'both-bad'
      ? RESULT_MESSAGES[vote]
      : vote
        ? vote === prompt.crispSide
          ? RESULT_MESSAGES.crisp
          : RESULT_MESSAGES.padded
        : null;

  return (
    <section id="try" aria-labelledby="try-title" className="mx-auto max-w-[1200px] scroll-mt-8 px-4 pb-24 sm:px-8 sm:pb-32">
      <SectionHeading
        id="try-title"
        index="02"
        label="Try a battle"
        lede="This is a battle in miniature. Read both answers, then vote. In the Arena, the names appear after your vote; here, you find out what each answer was doing."
      >
        Read both. <span className="human">Pick one.</span>
      </SectionHeading>

      <div
        ref={panelRef}
        className="mt-12 overflow-hidden rounded-[24px] border border-line bg-surface/80 shadow-[0_40px_120px_-60px_rgb(0_217_255/0.35)]"
        data-testid="battle"
      >
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:px-6">
          <span className="inline-flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
            <span className="size-1.5 rounded-full bg-violet" aria-hidden="true" />
            Battle · demo
          </span>
          <span>
            Prompt {index + 1} / {DEMO_PROMPTS.length}
          </span>
        </div>

        <div className="px-5 pt-6 sm:px-6">
          <p className="eyebrow">You asked</p>
          <p className="mt-2 text-[19px] leading-snug tracking-[-0.01em] text-fg sm:text-[22px]">{prompt.prompt}</p>
        </div>

        <div className="mt-6 grid gap-px border-y border-line-soft bg-line-soft md:grid-cols-2">
          {(['a', 'b'] as const).map(side => {
            const meta = SIDES[side];
            const text = answers[side];
            const visible = Number.isFinite(shown) ? text.slice(0, shown) : text;
            const typing = streaming && visible.length < text.length;
            const chosen = vote === side;
            const crisp = prompt.crispSide === side;
            return (
              <article
                key={side}
                aria-label={meta.label}
                className={cn(
                  'relative bg-surface px-5 py-5 transition-shadow duration-500 sm:px-6 sm:py-6',
                  chosen && `z-[1] ring-1 ring-inset ${meta.ring}`,
                )}
              >
                <header className="flex min-h-6 items-center justify-between gap-3">
                  <span className={cn('inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em]', meta.tint)}>
                    <span className={cn('size-2 rounded-full', meta.dot)} aria-hidden="true" />
                    {vote ? (
                      <>
                        <span aria-hidden="true">{side.toUpperCase()} ·</span>
                        <DecryptedText
                          key={`${index}-${vote}`}
                          text={crisp ? 'Answered the question' : 'Sounded good, said little'}
                          animateOn="view"
                          sequential
                          speed={28}
                          characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*"
                          encryptedClassName="text-muted"
                        />
                      </>
                    ) : (
                      meta.label
                    )}
                  </span>
                  {chosen && (
                    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-fg-soft">
                      Your pick
                    </span>
                  )}
                </header>
                <div className="relative mt-4 text-[15px] leading-relaxed text-fg-soft">
                  <p className="sr-only">{text}</p>
                  <p aria-hidden="true" className="invisible">
                    {text}
                  </p>
                  <p aria-hidden="true" className="absolute inset-0">
                    {visible}
                    {typing && <span className="caret text-cyan" />}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div ref={votesRef} role="group" aria-label="Your vote" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CHOICES.map(choice => {
              const picked = vote === choice.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => cast(choice.id)}
                  disabled={vote !== null}
                  aria-pressed={picked}
                  className={cn(
                    'h-12 rounded-[12px] border px-3 text-[14px] font-medium tracking-[-0.005em] transition-[background-color,border-color,color,transform] duration-200',
                    'enabled:hover:-translate-y-px enabled:hover:border-cyan/50 enabled:hover:bg-elevated enabled:active:translate-y-0',
                    picked
                      ? 'border-cyan/70 bg-cyan/10 text-fg'
                      : 'border-line bg-ink/60 text-fg-soft disabled:text-muted disabled:opacity-60',
                  )}
                >
                  {choice.label}
                </button>
              );
            })}
          </div>

          <div
            ref={resultRef}
            tabIndex={-1}
            aria-live="polite"
            className={cn('outline-none', result ? 'mt-5' : 'mt-0')}
            data-testid="battle-result"
          >
            {result && (
              <div className="flex flex-col gap-4 rounded-[16px] border border-line-soft bg-ink/50 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
                <div className="max-w-[68ch]">
                  <p className="text-[15px] leading-relaxed text-fg">{result}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-fg-soft">{prompt.notice}</p>
                  <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-muted">{DEMO_DISCLOSURE}</p>
                </div>
                <button
                  type="button"
                  onClick={next}
                  className="inline-flex h-11 flex-none items-center gap-2 self-start rounded-full border border-line bg-elevated px-4 text-[14px] font-medium text-fg transition-colors hover:border-cyan/50 sm:self-auto"
                >
                  Next prompt
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
