import type { MetaDescriptor } from 'react-router';
import { describe, expect, it } from 'vitest';

import { config } from '@/config/env';
import { absoluteUrl, pageMeta, SITE_NAME } from '@/lib/site/page-meta';

type Tag = Record<string, unknown>;

const find = (meta: MetaDescriptor[], key: string, value: string) =>
  meta.find(tag => (tag as Tag)[key] === value) as Tag | undefined;

const base = {
  title: 'Leaderboard · DualMind Arena',
  description: 'Every model, ranked by blind votes.',
  path: '/leaderboard/',
};

describe('absoluteUrl', () => {
  it('puts paths on the site origin and leaves absolute URLs alone', () => {
    expect(absoluteUrl('/og/leaderboard.png')).toBe(`${config.siteUrl}/og/leaderboard.png`);
    expect(absoluteUrl('og/leaderboard.png')).toBe(`${config.siteUrl}/og/leaderboard.png`);
    expect(absoluteUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
  });
});

describe('pageMeta', () => {
  it('sets the title, the description and a canonical URL on the site origin', () => {
    const meta = pageMeta(base);
    expect(meta[0]).toEqual({ title: 'Leaderboard · DualMind Arena' });
    expect(find(meta, 'name', 'description')?.content).toBe('Every model, ranked by blind votes.');
    expect(find(meta, 'rel', 'canonical')).toEqual({
      tagName: 'link',
      rel: 'canonical',
      href: `${config.siteUrl}/leaderboard/`,
    });
  });

  it('adds Open Graph and Twitter card tags that repeat the same text', () => {
    const meta = pageMeta(base);
    expect(find(meta, 'property', 'og:type')?.content).toBe('website');
    expect(find(meta, 'property', 'og:site_name')?.content).toBe(SITE_NAME);
    expect(find(meta, 'property', 'og:title')?.content).toBe(base.title);
    expect(find(meta, 'property', 'og:description')?.content).toBe(base.description);
    expect(find(meta, 'property', 'og:url')?.content).toBe(`${config.siteUrl}/leaderboard/`);
    expect(find(meta, 'name', 'twitter:card')?.content).toBe('summary');
    expect(find(meta, 'name', 'twitter:title')?.content).toBe(base.title);
    expect(find(meta, 'name', 'twitter:description')?.content).toBe(base.description);
  });

  it('sends no image, robots or structured data unless asked', () => {
    const meta = pageMeta(base);
    expect(find(meta, 'property', 'og:image')).toBeUndefined();
    expect(find(meta, 'name', 'twitter:image')).toBeUndefined();
    expect(find(meta, 'name', 'robots')).toBeUndefined();
    expect(meta.some(tag => 'script:ld+json' in tag)).toBe(false);
  });

  it('takes an article type', () => {
    const meta = pageMeta({ ...base, type: 'article' });
    expect(meta).toContainEqual({ property: 'og:type', content: 'article' });
  });

  it('adds a preview image on the site origin and switches to the large Twitter card', () => {
    const meta = pageMeta({
      ...base,
      image: { url: '/og/leaderboard.png', alt: 'The top three models', width: 1200, height: 630 },
    });
    const imageUrl = `${config.siteUrl}/og/leaderboard.png`;
    expect(find(meta, 'property', 'og:image')?.content).toBe(imageUrl);
    expect(find(meta, 'property', 'og:image:alt')?.content).toBe('The top three models');
    expect(find(meta, 'property', 'og:image:width')?.content).toBe('1200');
    expect(find(meta, 'property', 'og:image:height')?.content).toBe('630');
    expect(find(meta, 'name', 'twitter:card')?.content).toBe('summary_large_image');
    expect(find(meta, 'name', 'twitter:image')?.content).toBe(imageUrl);
    expect(find(meta, 'name', 'twitter:image:alt')?.content).toBe('The top three models');
  });

  it('leaves out image sizes it was not given, and keeps absolute image URLs', () => {
    const meta = pageMeta({
      ...base,
      image: { url: 'https://cdn.example.com/card.png', alt: 'Card' },
    });
    expect(find(meta, 'property', 'og:image')?.content).toBe('https://cdn.example.com/card.png');
    expect(find(meta, 'property', 'og:image:width')).toBeUndefined();
    expect(find(meta, 'property', 'og:image:height')).toBeUndefined();
  });

  it('adds a robots directive', () => {
    const meta = pageMeta({ ...base, path: '/design/', robots: 'noindex, nofollow' });
    expect(meta).toContainEqual({ name: 'robots', content: 'noindex, nofollow' });
  });

  it('adds JSON-LD structured data, one object or a list', () => {
    const dataset = { '@context': 'https://schema.org', '@type': 'Dataset', name: 'Leaderboard' };
    expect(pageMeta({ ...base, jsonLd: dataset })).toContainEqual({ 'script:ld+json': dataset });

    const list = [dataset, { '@context': 'https://schema.org', '@type': 'WebPage' }];
    const meta = pageMeta({ ...base, jsonLd: list });
    expect(meta.filter(tag => 'script:ld+json' in tag)).toEqual([{ 'script:ld+json': list }]);
  });

  it('lets callers append their own tags', () => {
    const meta = [...pageMeta(base), { name: 'format-detection', content: 'telephone=no' }];
    expect(meta.at(-1)).toEqual({ name: 'format-detection', content: 'telephone=no' });
  });
});
