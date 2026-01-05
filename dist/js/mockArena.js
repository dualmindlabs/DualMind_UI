/**
 * Mock Arena Engine
 * Creates high-quality demo replies and streams them like a real model.
 */

const MODEL_POOL = [
  { id: 'alpha', name: 'DualMind Alpha' },
  { id: 'beta', name: 'DualMind Beta' },
  { id: 'sigma', name: 'DualMind Sigma' },
  { id: 'nova', name: 'DualMind Nova' },
];

export function pickModelPair() {
  const pool = [...MODEL_POOL].sort(() => Math.random() - 0.5);
  const left = pool[0];
  const right = pool[1] ?? MODEL_POOL[1];
  return { left, right };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function buildMockReply(prompt, modelName, variant = 'balanced') {
  const p = (prompt || '').trim();
  const short = p.length > 140 ? `${p.slice(0, 140)}…` : p;

  const styles = {
    balanced: {
      intro: `Here’s a clear, practical answer to: “${short}”`,
      tone: 'balanced',
      bullets: ['Key idea', 'Steps', 'Edge cases', 'Quick example'],
    },
    creative: {
      intro: `Let’s turn “${short}” into something you can ship.`,
      tone: 'creative',
      bullets: ['Big picture', 'Options', 'Best pick', 'Why it works'],
    },
    precise: {
      intro: `Answering “${short}” with a structured breakdown.`,
      tone: 'precise',
      bullets: ['Assumptions', 'Plan', 'Implementation notes', 'Checks'],
    },
  };

  const s = styles[variant] ?? styles.balanced;

  return [
    `${s.intro}`,
    '',
    `### ${s.bullets[0]}`,
    '- Focus on the minimal change that delivers maximum impact.',
    '- Keep the interface consistent and predictable.',
    '',
    `### ${s.bullets[1]}`,
    '1. Clarify the goal and success criteria.',
    '2. Make the smallest safe changes first.',
    '3. Add polish: states, accessibility, and responsiveness.',
    '4. Verify with a quick checklist.',
    '',
    `### ${s.bullets[2]}`,
    '- Loading/disabled: prevent double actions.',
    '- Keyboard users: focus states + Escape behavior.',
    '- Mobile: avoid scroll bleed and layout overlap.',
    '',
    `### ${s.bullets[3]}`,
    'If you want, tell me your ideal output format and I’ll tailor the result.',
  ].join('\n');
}

/**
 * Streams text in small chunks for "typing" effect.
 * Returns a cancel() function and a promise.
 */
export function streamText(text, onChunk, opts = {}) {
  const minDelay = opts.minDelay ?? 12;
  const maxDelay = opts.maxDelay ?? 28;
  const minChunk = opts.minChunk ?? 1;
  const maxChunk = opts.maxChunk ?? 4;

  let cancelled = false;
  let i = 0;

  const promise = new Promise((resolve) => {
    const tick = () => {
      if (cancelled) return resolve({ cancelled: true });
      if (i >= text.length) return resolve({ cancelled: false });

      const chunkSize = clamp(
        Math.floor(minChunk + Math.random() * (maxChunk - minChunk + 1)),
        1,
        8
      );
      const next = text.slice(i, i + chunkSize);
      i += chunkSize;
      onChunk(next);

      const delay = clamp(
        Math.floor(minDelay + Math.random() * (maxDelay - minDelay)),
        0,
        120
      );
      window.setTimeout(tick, delay);
    };

    tick();
  });

  return {
    cancel: () => { cancelled = true; },
    promise,
  };
}


