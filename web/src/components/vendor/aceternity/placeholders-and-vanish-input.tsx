/**
 * Placeholders And Vanish Input, from Aceternity UI (free tier).
 * Source: https://ui.aceternity.com/registry/placeholders-and-vanish-input.json (copied 2026-10-20)
 * Licence: Aceternity UI licence, https://ui.aceternity.com/licence (see ./LICENSE-NOTES.md).
 * Our changes:
 * - Accessible form control: a real <label> (visible or visually hidden), a controlled value
 *   (`value` + `onValueChange`), `onSubmit` with the submitted text, a labelled submit button.
 * - The rotating examples are a decorative overlay (aria-hidden, never announced: no live
 *   region); screen readers get the first example once, as the field's description.
 * - Rotation pauses while the field has focus, while it has text, in hidden tabs and under
 *   reduced motion (then only the first example shows).
 * - Enter submits through the form (native behaviour); empty or whitespace-only text does not.
 * - The vanish effect draws the text in the field's own colour (no invert filter) and is skipped
 *   under reduced motion; the field clears when it ends.
 * - The examples slide with CSS animations (styles/effects.css) instead of AnimatePresence, so
 *   the field needs no Motion features; design tokens instead of the zinc/neutral palette, our
 *   focus ring, a Lucide arrow.
 */
import { ArrowUp } from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';

import { usePageVisible } from '@/hooks/use-page-visible';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface PlaceholdersAndVanishInputProps {
  /** The field's label. */
  label: string;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
  /** Example prompts, shown in turn while the field is empty. */
  placeholders: string[];
  value: string;
  onValueChange: (value: string) => void;
  /** Called with the text when the visitor presses Enter or the send button. */
  onSubmit: (value: string) => void;
  name?: string;
  /** Accessible name of the send button. */
  submitLabel?: string;
  /** Milliseconds between two examples. */
  interval?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  color: string;
}

const CANVAS_SIZE = 800;

/** The hero prompt box: rotating example prompts, and the text vanishes into the battle on send. */
export function PlaceholdersAndVanishInput({
  label,
  hideLabel = false,
  placeholders,
  value,
  onValueChange,
  onSubmit,
  name,
  submitLabel = 'Send',
  interval = 3000,
  className,
}: PlaceholdersAndVanishInputProps) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const reduce = useShouldReduceMotion();
  const pageVisible = usePageVisible();
  const [examples, setExamples] = useState<{ current: number; previous: number | null }>({
    current: 0,
    previous: null,
  });
  const [focused, setFocused] = useState(false);
  const [animating, setAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const changeRef = useRef(onValueChange);

  useEffect(() => {
    changeRef.current = onValueChange;
  });

  const rotating = !reduce && !focused && pageVisible && value === '' && placeholders.length > 1;

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = window.setInterval(
      () =>
        setExamples(({ current }) => ({
          current: (current + 1) % placeholders.length,
          previous: current,
        })),
      interval,
    );
    return () => window.clearInterval(timer);
  }, [rotating, placeholders.length, interval]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  /** Paints the text on the canvas and turns its pixels into particles. */
  const capture = (text: string): number => {
    const input = inputRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!input || !canvas || !ctx) return 0;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const styles = getComputedStyle(input);
    const fontSize = parseFloat(styles.fontSize);
    ctx.font = `${fontSize * 2}px ${styles.fontFamily}`;
    ctx.fillStyle = styles.color;
    ctx.fillText(text, 16, 40);
    const pixels = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
    const particles: Particle[] = [];
    let maxX = 0;
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        const index = 4 * (y * CANVAS_SIZE + x);
        const alpha = pixels[index + 3] ?? 0;
        if (alpha === 0) continue;
        particles.push({
          x,
          y,
          r: 1,
          color: `rgba(${pixels[index] ?? 0}, ${pixels[index + 1] ?? 0}, ${pixels[index + 2] ?? 0}, ${alpha / 255})`,
        });
        maxX = Math.max(maxX, x);
      }
    }
    particlesRef.current = particles;
    return maxX;
  };

  const vanish = (start: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    const step = (position: number) => {
      frameRef.current = requestAnimationFrame(() => {
        const next: Particle[] = [];
        for (const particle of particlesRef.current) {
          if (particle.x < position) {
            next.push(particle);
            continue;
          }
          if (particle.r <= 0) continue;
          particle.x += Math.random() > 0.5 ? 1 : -1;
          particle.y += Math.random() > 0.5 ? 1 : -1;
          particle.r -= 0.05 * Math.random();
          next.push(particle);
        }
        particlesRef.current = next;
        if (ctx) {
          ctx.clearRect(position, 0, CANVAS_SIZE, CANVAS_SIZE);
          for (const particle of next) {
            if (particle.x > position) {
              ctx.fillStyle = particle.color;
              ctx.fillRect(particle.x, particle.y, particle.r, particle.r);
            }
          }
        }
        if (next.length > 0) {
          step(position - 8);
        } else {
          setAnimating(false);
          changeRef.current('');
        }
      });
    };
    step(start);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || animating) return;
    onSubmit(text);
    if (reduce) {
      onValueChange('');
      return;
    }
    const maxX = capture(value);
    if (maxX === 0) {
      onValueChange('');
      return;
    }
    setAnimating(true);
    vanish(maxX);
  };

  const count = Math.max(1, placeholders.length);
  const example = placeholders[examples.current % count] ?? '';
  const previous =
    examples.previous === null ? null : (placeholders[examples.previous % count] ?? null);
  const firstExample = placeholders[0];

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('relative mx-auto w-full max-w-xl', hideLabel ? '' : 'grid gap-2', className)}
    >
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'text-ui-sm font-medium text-fg'}>
        {label}
      </label>
      {firstExample ? (
        <p id={hintId} className="sr-only">
          For example: {firstExample}
        </p>
      ) : null}
      <div
        className={cn(
          'relative h-12 overflow-hidden rounded-full border border-line-strong bg-surface-2 shadow-raise transition-colors duration-(--dur-fast)',
          'hover:border-fg-soft has-[input:focus-visible]:outline-(length:--focus-width) has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus has-[input:focus-visible]:outline-solid',
        )}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-[20%] left-4 origin-top-left scale-50 pr-20 sm:left-6',
            animating ? 'opacity-100' : 'opacity-0',
          )}
        />
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          value={value}
          autoComplete="off"
          enterKeyHint="send"
          aria-describedby={firstExample ? hintId : undefined}
          onChange={event => {
            if (!animating) onValueChange(event.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            'relative z-10 h-full w-full rounded-full border-none bg-transparent pr-14 pl-4 text-ui text-fg outline-none sm:pl-6',
            animating && 'text-transparent',
          )}
        />
        <button
          type="submit"
          disabled={!value.trim() || animating}
          aria-label={submitLabel}
          className="absolute top-1/2 right-1.5 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-mind-a text-on-accent transition-colors duration-(--dur-fast) disabled:bg-surface disabled:text-muted"
        >
          <ArrowUp aria-hidden="true" className="size-4" strokeWidth={2.25} />
        </button>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center rounded-full"
        >
          {value === '' && previous !== null && rotating ? (
            <p
              key={`out-${examples.previous}`}
              className="absolute inset-y-0 flex w-[calc(100%-4rem)] animate-placeholder-out items-center truncate pl-4 text-left text-ui text-muted sm:pl-6"
              onAnimationEnd={() => setExamples(state => ({ ...state, previous: null }))}
            >
              {previous}
            </p>
          ) : null}
          {value === '' ? (
            <p
              key={`in-${examples.current}`}
              data-placeholder="current"
              className={cn(
                'w-[calc(100%-4rem)] truncate pl-4 text-left text-ui text-muted sm:pl-6',
                examples.previous !== null && 'animate-placeholder-in',
              )}
            >
              {example}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
