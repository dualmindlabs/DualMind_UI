import type { MetaDescriptor } from 'react-router';

import { config } from '@/config/env';

export const SITE_NAME = 'DualMind Arena';

/** A link-preview image. */
export interface PageMetaImage {
  /** An absolute URL, or a path on this site ("/og/leaderboard.png"). */
  url: string;
  /** What the image shows, for people who cannot see it. */
  alt: string;
  width?: number;
  height?: number;
}

/**
 * Structured data for search engines: a schema.org object or a list of them, rendered as one
 * `<script type="application/ld+json">` (React Router's own type).
 */
export type JsonLd = Extract<MetaDescriptor, { 'script:ld+json': unknown }>['script:ld+json'];

export interface PageMetaInput {
  /** The full document title, for example "Leaderboard · DualMind Arena". */
  title: string;
  /** One or two sentences for search results and link previews (about 150 characters). */
  description: string;
  /** The page's public path with its trailing slash, for example "/leaderboard/". */
  path: string;
  /** Open Graph type. */
  type?: 'website' | 'article';
  /** The link-preview image; with one, Twitter shows the large card. */
  image?: PageMetaImage;
  /** The robots directive, for example "noindex, nofollow" for the style guide. */
  robots?: string;
  /** Structured data (schema.org), as JSON-LD. */
  jsonLd?: JsonLd;
}

/** An absolute URL on the site's public origin (VITE_SITE_URL) for a path; URLs pass through. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${config.siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/**
 * The tags a page needs for search engines and link previews: title, description, canonical URL
 * (on the production origin from VITE_SITE_URL), Open Graph and Twitter card, and optionally a
 * preview image, a robots directive and JSON-LD structured data. Route modules return it from
 * their `meta` function, and can append their own entries:
 *
 * ```ts
 * export const meta: Route.MetaFunction = () => [
 *   ...pageMeta({ title, description, path: '/leaderboard/' }),
 *   { name: 'format-detection', content: 'telephone=no' },
 * ];
 * ```
 */
export function pageMeta({
  title,
  description,
  path,
  type = 'website',
  image,
  robots,
  jsonLd,
}: PageMetaInput): MetaDescriptor[] {
  const url = absoluteUrl(path);
  const tags: MetaDescriptor[] = [{ title }, { name: 'description', content: description }];
  if (robots) tags.push({ name: 'robots', content: robots });
  tags.push(
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: type },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
  );
  if (image) {
    const imageUrl = absoluteUrl(image.url);
    tags.push({ property: 'og:image', content: imageUrl });
    tags.push({ property: 'og:image:alt', content: image.alt });
    if (image.width !== undefined) {
      tags.push({ property: 'og:image:width', content: String(image.width) });
    }
    if (image.height !== undefined) {
      tags.push({ property: 'og:image:height', content: String(image.height) });
    }
  }
  tags.push(
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  );
  if (image) {
    tags.push({ name: 'twitter:image', content: absoluteUrl(image.url) });
    tags.push({ name: 'twitter:image:alt', content: image.alt });
  }
  if (jsonLd !== undefined) tags.push({ 'script:ld+json': jsonLd });
  return tags;
}
