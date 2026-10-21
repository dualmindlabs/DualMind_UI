import { describe, expect, it } from 'vitest';

import { footerColumns, isActivePath, primaryNav } from '@/lib/site/links';

describe('site links', () => {
  it('lists the header navigation in order', () => {
    expect(primaryNav.map(link => link.label)).toEqual([
      'Arena',
      'Leaderboard',
      'Models',
      'How it works',
    ]);
  });

  it('uses trailing-slash paths for every page but the home page', () => {
    const links = [...primaryNav, ...footerColumns.flatMap(column => column.links)];
    for (const link of links) {
      expect(link.href === '/' || /^\/[a-z-]+\/$/.test(link.href), link.href).toBe(true);
    }
  });

  it('has the product, company and legal footer columns', () => {
    expect(footerColumns.map(column => column.title)).toEqual(['Product', 'Company', 'Legal']);
    expect(footerColumns[2]?.links.map(link => link.href)).toEqual([
      '/privacy/',
      '/terms/',
      '/cookies/',
    ]);
  });
});

describe('isActivePath', () => {
  it('matches the home page only on /', () => {
    expect(isActivePath('/', '/')).toBe(true);
    expect(isActivePath('/', '/leaderboard/')).toBe(false);
  });

  it('matches a section and its sub-pages, with or without the trailing slash', () => {
    expect(isActivePath('/models/', '/models/')).toBe(true);
    expect(isActivePath('/models/', '/models')).toBe(true);
    expect(isActivePath('/models/', '/models/atlas-2/')).toBe(true);
  });

  it('does not match a different page that shares a prefix', () => {
    expect(isActivePath('/models/', '/models-archive/')).toBe(false);
    expect(isActivePath('/leaderboard/', '/design/')).toBe(false);
  });
});
