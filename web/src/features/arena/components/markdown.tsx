import { type ComponentProps, memo, type ReactNode } from 'react';
import { defaultRehypePlugins, type ExtraProps, Streamdown } from 'streamdown';

import { CodeBlock } from './code-block';
import { SafeLink } from './safe-link';

/**
 * Model answers as Markdown (design-direction.md section 11). Streamdown parses it, including
 * unfinished Markdown while an answer streams in, and renders React elements, never raw HTML:
 *
 * - Raw HTML in an answer is skipped (`skipHtml`, and no rehype-raw), then the default
 *   rehype-sanitize schema runs, then rehype-harden.
 * - Links: only `https://` links become links (SafeLink), always in a new tab with
 *   `rel="noopener noreferrer nofollow"` and the destination host shown next to the text.
 *   `javascript:`, `data:` and the other dangerous protocols are removed by rehype-harden.
 * - Images never load (no remote images, no `data:` images): an answer cannot leak anything
 *   through an image URL. A short marker with the alt text stays in their place.
 * - Code blocks have a language label and a copy button (code-block.tsx); tables scroll inside
 *   the pane.
 *
 * The XSS corpus in tests/unit/features/arena/markdown.test.tsx keeps these promises.
 */

type RehypePlugins = NonNullable<ComponentProps<typeof Streamdown>['rehypePlugins']>;
type Components = NonNullable<ComponentProps<typeof Streamdown>['components']>;

/** Where relative URLs would resolve; they never become links (SafeLink takes https only). */
const ANSWER_ORIGIN = 'https://arena.dualmindlab.tech';

const HARDEN_OPTIONS = {
  defaultOrigin: ANSWER_ORIGIN,
  // Every http(s) URL passes rehype-harden; SafeLink then keeps only https.
  allowedLinkPrefixes: ['*'],
  // No image prefix is allowed: every image is replaced by a marker.
  allowedImagePrefixes: [],
  allowDataImages: false,
  allowedProtocols: [],
  linkBlockPolicy: 'text-only',
  imageBlockPolicy: 'indicator',
  blockedImageClass: 'answer-blocked',
  blockedLinkClass: 'answer-blocked',
} as const;

function pluginFunction(plugin: unknown): unknown {
  return Array.isArray(plugin) ? (plugin[0] as unknown) : plugin;
}

/** Sanitize with Streamdown's schema, then harden with ours. No rehype-raw. */
export const ANSWER_REHYPE_PLUGINS = [
  defaultRehypePlugins.sanitize,
  [pluginFunction(defaultRehypePlugins.harden), HARDEN_OPTIONS],
].filter(Boolean) as unknown as RehypePlugins;

function textOf(children: ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(textOf).join('');
  return '';
}

type CodeProps = ComponentProps<'code'> & ExtraProps & { 'data-block'?: string };

/** Fenced code (Streamdown marks it with `data-block`) gets the block; inline code stays code. */
function AnswerCode({ node: _node, className, children, ...props }: CodeProps) {
  if ('data-block' in props) {
    const language = /language-([\w+#-]+)/.exec(className ?? '')?.[1] ?? null;
    return <CodeBlock code={textOf(children).replace(/\n$/, '')} language={language} />;
  }
  return <code className={className}>{children}</code>;
}

function AnswerTable({ node: _node, children, ...props }: ComponentProps<'table'> & ExtraProps) {
  return (
    // A wide table scrolls inside the pane; the region is focusable so keyboards can scroll it.
    <div
      data-answer-block=""
      role="region"
      aria-label="Table"
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="overflow-x-auto rounded-md border border-line"
    >
      <table {...props} className="m-0!">
        {children}
      </table>
    </div>
  );
}

function AnswerLink({ node: _node, href, children }: ComponentProps<'a'> & ExtraProps) {
  return <SafeLink href={href}>{children}</SafeLink>;
}

/**
 * An answer's headings sit under the pane's own heading (h3), so "# Title" becomes an h4 and
 * deeper ones h5 or h6; `data-level` keeps the author's level for the type scale.
 */
function heading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = level === 1 ? 'h4' : level === 2 ? 'h5' : 'h6';
  function AnswerHeading({ node: _node, children }: ComponentProps<'h1'> & ExtraProps) {
    return <Tag data-level={level}>{children}</Tag>;
  }
  return AnswerHeading;
}

const COMPONENTS: Components = {
  code: AnswerCode,
  table: AnswerTable,
  a: AnswerLink,
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  h5: heading(5),
  h6: heading(6),
};

export interface MarkdownProps {
  children: string;
  /** True while text is still arriving: unfinished Markdown is completed for display. */
  streaming?: boolean;
  className?: string;
}

/** One answer, rendered safely. Memoised: a pane re-renders only when its text changes. */
export const Markdown = memo(function Markdown({
  children,
  streaming = false,
  className,
}: MarkdownProps) {
  return (
    <Streamdown
      className={className}
      mode={streaming ? 'streaming' : 'static'}
      isAnimating={streaming}
      parseIncompleteMarkdown={streaming}
      skipHtml
      rehypePlugins={ANSWER_REHYPE_PLUGINS}
      components={COMPONENTS}
      controls={false}
      linkSafety={{ enabled: false }}
      lineNumbers={false}
    >
      {children}
    </Streamdown>
  );
});
