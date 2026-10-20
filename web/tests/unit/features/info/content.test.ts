import { describe, expect, it } from 'vitest';

import { type Block, infoPages, MAX_DESCRIPTION_LENGTH, type PageContent } from '@/features/info';

function blockText(block: Block): string[] {
  switch (block.type) {
    case 'paragraph':
      return [block.text];
    case 'list':
      return [...block.items];
    case 'callout':
      return [block.title ?? '', block.text];
    case 'faq':
      return [block.question, ...block.answer];
    case 'steps':
      return block.items.flatMap(item => [item.title, item.body]);
    case 'definitions':
      return block.items.flatMap(item => [item.term, item.description]);
  }
}

function allText(page: PageContent): string[] {
  return [
    page.title,
    page.description,
    page.intro,
    page.heading.text,
    page.heading.human ?? '',
    ...page.sections.flatMap(section => [
      section.heading,
      section.human ?? '',
      ...section.blocks.flatMap(blockText),
    ]),
  ];
}

// Phrases that would claim the site does something it does not (positive statements only;
// "we do not use analytics" is allowed and expected).
const falseClaims: RegExp[] = [
  /\bwe (?:use|run|collect|enable|deploy)\b[^.]{0,40}\b(?:analytics|advertis\w*|ads|tracking pixels?|a\/b test\w*)/i,
  /\b(?:analytics|advertising|marketing) cookies (?:help|are used|we use)/i,
  /\bwe (?:share|sell) [^.]{0,40}\bwith (?:advertisers|marketers)/i,
  /\bmarketing communications\b/i,
];

describe('info page content', () => {
  it('has the six pages with unique slugs', () => {
    const slugs = infoPages.map(page => page.slug);
    expect(slugs).toEqual(['about', 'how-it-works', 'faq', 'privacy', 'terms', 'cookies']);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(infoPages.map(page => [page.slug, page] as const))(
    '%s has a title and intro',
    (_slug, page) => {
      expect(page.title.trim()).not.toBe('');
      expect(page.eyebrow.trim()).not.toBe('');
      expect(page.heading.text.trim()).not.toBe('');
      expect(page.intro.trim()).not.toBe('');
      expect(page.sections.length).toBeGreaterThan(0);
    },
  );

  it.each(infoPages.map(page => [page.slug, page] as const))(
    '%s has a description of at most the allowed length',
    (_slug, page) => {
      expect(page.description.length).toBeGreaterThan(40);
      expect(page.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    },
  );

  it.each(infoPages.map(page => [page.slug, page] as const))(
    '%s has unique kebab-case section ids',
    (_slug, page) => {
      const ids = page.sections.map(section => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      for (const section of page.sections) expect(section.blocks.length).toBeGreaterThan(0);
    },
  );

  it('gives each legal page a summary callout and the update date', () => {
    for (const slug of ['privacy', 'terms', 'cookies']) {
      const page = infoPages.find(p => p.slug === slug);
      expect(page?.updated).toBe('2026-10-20');
      const hasSummary = page?.sections.some(section =>
        section.blocks.some(block => block.type === 'callout' && block.tone === 'summary'),
      );
      expect(hasSummary).toBe(true);
    }
  });

  it('has 12 to 16 FAQ questions', () => {
    const faq = infoPages.find(page => page.slug === 'faq');
    const questions =
      faq?.sections.flatMap(s => s.blocks).filter(block => block.type === 'faq') ?? [];
    expect(questions.length).toBeGreaterThanOrEqual(12);
    expect(questions.length).toBeLessThanOrEqual(16);
  });

  it('never claims analytics, advertising or tracking that the site does not have', () => {
    for (const page of infoPages) {
      for (const text of allText(page)) {
        for (const pattern of falseClaims) {
          expect(text, `${page.slug}: ${pattern}`).not.toMatch(pattern);
        }
      }
    }
  });

  it('contains no emoji and no long dashes', () => {
    for (const page of infoPages) {
      for (const text of allText(page)) {
        expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(text).not.toMatch(/—/);
      }
    }
  });
});
