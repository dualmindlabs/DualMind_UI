import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** The URL when it is an absolute https link, else null. */
export function safeHttpsUrl(href: string | undefined | null): URL | null {
  if (!href || !/^https:\/\//i.test(href.trim())) return null;
  try {
    const url = new URL(href.trim());
    return url.protocol === 'https:' && url.hostname !== '' ? url : null;
  } catch {
    return null;
  }
}

/**
 * A link written by a model. Only absolute https links become links; anything else (http,
 * relative paths, other protocols) stays as plain text. A link opens in a new tab without a
 * referrer or an opener, is marked `nofollow`, and shows its host, so nobody clicks blind.
 */
export function SafeLink({ href, children }: { href: string | undefined; children: ReactNode }) {
  const url = safeHttpsUrl(href);
  if (!url) return <span>{children}</span>;
  const host = url.hostname.replace(/^www\./, '');

  return (
    <a
      href={url.href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-mind-a underline decoration-mind-a/45 underline-offset-[0.22em] transition-[text-decoration-color] duration-(--dur-fast) hover:decoration-current"
    >
      {children}
      <span className="ml-1 inline-flex items-baseline gap-0.5 font-mono text-caption whitespace-nowrap text-muted no-underline">
        <span aria-hidden="true">(</span>
        <span className="sr-only">, opens </span>
        {host}
        <ArrowUpRight aria-hidden="true" className="size-3 self-center" strokeWidth={2} />
        <span aria-hidden="true">)</span>
        <span className="sr-only"> in a new tab</span>
      </span>
    </a>
  );
}
