import { useEffect, useRef, useState } from 'react';

import { type CodeLanguage, type CodeLine, highlightCode } from '../lib/highlight';

export interface HighlightedCode {
  /** The code the lines were made from. */
  code: string;
  lines: readonly CodeLine[];
}

/** While text streams in, wait for a short pause before highlighting the grown code again. */
const STREAMING_PAUSE_MS = 120;

/**
 * Shiki's coloured lines for a code block, or null while they load, when the language is not
 * one we highlight (`language` null), when the block is too long, or when a chunk failed to load.
 * The result names the code it was made from: when more code streams in, the caller keeps the
 * colours of the part that did not change and shows the rest plain until the next pass.
 */
export function useHighlightedCode(
  code: string,
  language: CodeLanguage | null,
): HighlightedCode | null {
  const [result, setResult] = useState<HighlightedCode | null>(null);
  /** What the last pass highlighted (language and code), so a pass never repeats. */
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (language === null || code.trim() === '') return;
    const key = `${language}\n${code}`;
    if (done.current === key) return;
    let cancelled = false;
    const run = () => {
      highlightCode(code, language).then(
        lines => {
          if (cancelled) return;
          done.current = key;
          setResult(lines === null ? null : { code, lines });
        },
        () => {
          // Offline, or a chunk from an older deploy: the plain code stays, nothing breaks.
        },
      );
    };
    // The first pass runs at once; later passes (the code grew while streaming) wait for a pause.
    const timer = window.setTimeout(run, done.current === null ? 0 : STREAMING_PAUSE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [code, language]);

  return language === null ? null : result;
}
