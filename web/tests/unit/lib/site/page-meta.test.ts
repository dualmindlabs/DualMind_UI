import { describe, expect, it } from 'vitest';

import { config } from '@/config/env';
import { pageMeta, SITE_NAME } from '@/lib/site/page-meta';

describe('pageMeta', () => {
  const meta = pageMeta({
    title: 'Leaderboard · DualMind Arena',
    description: 'Every model, ranked by blind votes.',
    path: '/leaderboard/',
  });

  const find = (key: string, value: string) =>
    meta.find(tag => (tag as Record<string, unknown>)[key] === value) as
      | Record<string, unknown>
      | undefined;

  it('sets the title, the description and a canonical URL on the site origin', () => {
    expect(meta[0]).toEqual({ title: 'Leaderboard · DualMind Arena' });
    expect(find('name', 'description')?.content).toBe('Every model, ranked by blind votes.');
    expect(find('rel', 'canonical')).toEqual({
      tagName: 'link',
      rel: 'canonical',
      href: `${config.siteUrl}/leaderboard/`,
    });
  });

  it('adds Open Graph and Twitter card tags that repeat the same text', () => {
    expect(find('property', 'og:type')?.content).toBe('website');
    expect(find('property', 'og:site_name')?.content).toBe(SITE_NAME);
    expect(find('property', 'og:title')?.content).toBe('Leaderboard · DualMind Arena');
    expect(find('property', 'og:description')?.content).toBe(
      'Every model, ranked by blind votes.',
    );
    expect(find('property', 'og:url')?.content).toBe(`${config.siteUrl}/leaderboard/`);
    expect(find('name', 'twitter:card')?.content).toBe('summary');
    expect(find('name', 'twitter:title')?.content).toBe('Leaderboard · DualMind Arena');
  });

  it('takes an article type', () => {
    const article = pageMeta({ title: 'T', description: 'D', path: '/about/', type: 'article' });
    expect(article).toContainEqual({ property: 'og:type', content: 'article' });
  });
});
