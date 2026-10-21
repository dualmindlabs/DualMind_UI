import { Fragment } from 'react';

/** An email address, or a link written as `[label](href)`. */
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

/**
 * Plain text from the content files, with email addresses turned into mailto links and
 * `[label](href)` into links (site paths stay in the tab; https links get rel="noopener").
 */
export function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN)) {
    const start = match.index;
    if (start > last) nodes.push(<Fragment key={`t${last}`}>{text.slice(last, start)}</Fragment>);
    const [whole, label, href, email] = match;
    if (email) {
      nodes.push(
        <a key={`e${start}`} href={`mailto:${email}`}>
          {email}
        </a>,
      );
    } else {
      const external = /^https?:\/\//.test(href ?? '');
      nodes.push(
        <a key={`l${start}`} href={href} {...(external ? { rel: 'noopener noreferrer' } : {})}>
          {label}
        </a>,
      );
    }
    last = start + whole.length;
  }
  if (last < text.length) nodes.push(<Fragment key={`t${last}`}>{text.slice(last)}</Fragment>);
  return <>{nodes}</>;
}
