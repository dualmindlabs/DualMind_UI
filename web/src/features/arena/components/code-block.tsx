import { CopyButton } from './copy-button';

export interface CodeBlockProps {
  code: string;
  language: string | null;
}

/**
 * A fenced code block in an answer: the language in the label voice, a copy button, and the
 * code in JetBrains Mono, scrolling sideways inside the pane (focusable, so keyboards can scroll
 * it too). No colours yet: syntax highlighting (Shiki) is planned once the arena's bundle has room.
 */
export function CodeBlock({ code, language }: CodeBlockProps) {
  const name = language ? language.toLowerCase() : 'code';
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
        className="m-0 overflow-x-auto px-3.5 py-3 font-code text-caption leading-[1.6] text-fg"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}
