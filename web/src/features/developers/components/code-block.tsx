import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';

import { tokenize, type TokenKind } from '../lib/highlight';

const kindClass: Record<TokenKind, string> = {
  plain: 'text-fg',
  string: 'text-mind-a',
  key: 'text-fg-soft',
  keyword: 'text-mind-b-text',
  number: 'text-human',
  flag: 'text-human',
  comment: 'text-muted italic',
};

/** The copy button: writes the sample to the clipboard and says so (polite live region). */
function CopyButton({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = () => {
    void navigator.clipboard
      ?.writeText(code)
      .then(() => {
        setCopied(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => undefined);
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      className="inline-flex h-8 min-w-8 press items-center justify-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 font-mono text-label text-fg-soft transition-colors duration-(--dur-fast) hover:border-line-strong hover:text-fg pointer-coarse:h-11 pointer-coarse:min-w-11"
    >
      {copied ? (
        <Check aria-hidden="true" strokeWidth={2} className="size-3.5 text-ok" />
      ) : (
        <Copy aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
      )}
      <span aria-live="polite" className="hidden sm:inline">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  );
}

/**
 * A code sample in a window: a title bar with the language and a copy button, then the code with
 * light syntax colour. The scroll container is focusable and named, so keyboard users can scroll a
 * long line (axe: scrollable-region-focusable). The text content is exactly the sample.
 */
export function CodeBlock({
  code,
  label,
  language = 'plain',
  title,
  className,
}: {
  code: string;
  label: string;
  language?: string;
  title?: string;
  className?: string;
}) {
  return (
    <figure className={cn('not-prose surface-duel m-0 overflow-hidden', className)}>
      <figcaption className="flex min-h-11 items-center justify-between gap-3 border-b border-line bg-bg-deep/60 px-3 pl-4">
        <span className="flex items-center gap-2.5 font-mono text-label text-muted">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2 rounded-full bg-mind-a/70" />
            <span className="size-2 rounded-full bg-mind-b/70" />
          </span>
          {title ?? language}
        </span>
        <CopyButton code={code} label={label} />
      </figcaption>
      <div
        role="region"
        aria-label={label}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard
        tabIndex={0}
        className="overflow-x-auto bg-bg-deep/40 focus-ring-inset"
      >
        <pre className="m-0 w-max min-w-full p-4 font-mono text-ui-sm leading-relaxed">
          <code>
            {tokenize(code, language).map((token, index) => (
              <span key={index} className={kindClass[token.kind]}>
                {token.text}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </figure>
  );
}
