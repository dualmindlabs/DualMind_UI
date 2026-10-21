import { Fragment } from 'react';

import { cn } from '@/lib/utils/cn';

import { type HighlightedCode, useHighlightedCode } from '../hooks/use-highlighted-code';
import { type CodeLine, resolveCodeLanguage } from '../lib/highlight';
import { CopyButton } from './copy-button';

export interface CodeBlockProps {
  code: string;
  language: string | null;
}

/** Coloured lines, then any code that arrived after them (streaming), plain. */
function HighlightedLines({ lines, rest }: { lines: readonly CodeLine[]; rest: string }) {
  return (
    <>
      {lines.map((line, index) => (
        // Lines and tokens never reorder: the position is their identity.
        <Fragment key={index}>
          {index > 0 ? '\n' : null}
          {line.map((token, position) =>
            token.color === null && !token.italic && !token.bold && !token.underline ? (
              <Fragment key={position}>{token.content}</Fragment>
            ) : (
              <span
                key={position}
                // A `var(--code-token-*)` reference from the CSS-variables theme, never a value.
                style={token.color === null ? undefined : { color: token.color }}
                className={cn(
                  token.italic && 'italic',
                  token.bold && 'font-semibold',
                  token.underline && 'underline underline-offset-2',
                )}
              >
                {token.content}
              </span>
            ),
          )}
        </Fragment>
      ))}
      {rest}
    </>
  );
}

/** The highlighted result when it still describes the code on screen (or the start of it). */
function usableResult(code: string, result: HighlightedCode | null): HighlightedCode | null {
  return result !== null && code.startsWith(result.code) ? result : null;
}

/**
 * A fenced code block in an answer: the language in the label voice, a copy button, and the
 * code in JetBrains Mono, scrolling sideways inside the pane (focusable, so keyboards can scroll
 * it too). Known languages get Shiki colours once their grammar has loaded (lib/highlight.ts);
 * until then, and for every other language, the same code shows plain in the same metrics, so
 * the block never changes size when the colours arrive.
 */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const name = language ? language.toLowerCase() : 'code';
  const result = useHighlightedCode(code, resolveCodeLanguage(language));
  const highlighted = usableResult(code, result);

  return (
    <figure
      data-answer-block=""
      className="overflow-hidden rounded-md border border-line bg-surface"
      aria-label={language ? `Code, ${name}` : 'Code'}
    >
      <figcaption className="flex h-9 items-center justify-between gap-2 border-b border-line pr-1.5 pl-3">
        <span className="eyebrow text-muted">{name}</span>
        <CopyButton text={code} label={`Copy the ${name} code`} showLabel />
      </figcaption>
      <pre
        // A scrolling region must be reachable by keyboard (WCAG 2.1.1).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        data-highlighted={
          highlighted === null ? undefined : highlighted.code === code ? 'true' : 'partial'
        }
        className="m-0 overflow-x-auto px-3.5 py-3 font-code text-caption leading-[1.6] text-fg"
      >
        <code>
          {highlighted === null ? (
            code
          ) : (
            <HighlightedLines
              lines={highlighted.lines}
              rest={code.slice(highlighted.code.length)}
            />
          )}
        </code>
      </pre>
    </figure>
  );
}
