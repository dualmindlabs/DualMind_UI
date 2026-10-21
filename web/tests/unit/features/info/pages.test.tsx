import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { credits } from '@/content/credits';
import {
  aboutContent,
  AboutPage,
  faqContent,
  FaqPage,
  HowItWorksPage,
  infoMeta,
  notFoundMeta,
  NotFoundPage,
  privacyContent,
  PrivacyPage,
} from '@/features/info';
import { faqJsonLd } from '@/features/info/lib/seo';

import { renderWithShell } from '../../render-with-shell';

describe('info pages', () => {
  it('About: one h1 with its human phrase, and every credit', () => {
    const { container } = renderWithShell(<AboutPage />, '/about/');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Compare AI models, blind.');
    expect(h1.querySelector('.human-voice')).toHaveTextContent('blind.');
    const section = container.querySelector<HTMLElement>('#credits');
    expect(section).toHaveAttribute('aria-labelledby', 'credits-title');
    if (!section) return;
    expect(section.querySelectorAll('li')).toHaveLength(credits.length);
  });

  it('How it works: diagram labels, timeline steps and the rating section', () => {
    const { container } = renderWithShell(<HowItWorksPage />, '/how-it-works/');
    expect(screen.getByText('Answer A')).toBeInTheDocument();
    expect(screen.getByText('Step 4')).toBeInTheDocument();
    expect(container.querySelector('section#rating')).not.toBeNull();
  });

  it('FAQ: every question is a button and has an id', () => {
    const { container } = renderWithShell(<FaqPage />, '/faq/');
    const questions = faqContent.sections.flatMap(section =>
      section.blocks.flatMap(block => (block.type === 'faq' ? [block.question] : [])),
    );
    expect(screen.getAllByRole('button', { name: /\?$/ }).length).toBe(questions.length);
    expect(container.querySelectorAll('div[id] > [data-slot="accordion-item"] button').length).toBe(
      questions.length,
    );
  });

  it('Privacy: summary box, last updated date and a table of contents', () => {
    renderWithShell(<PrivacyPage />, '/privacy/');
    expect(screen.getAllByRole('note')[0]).toHaveTextContent('We do not use analytics');
    expect(screen.getByText('20 October 2026')).toHaveAttribute('datetime', '2026-10-20');
    const nav = screen.getAllByRole('navigation', { name: 'On this page' })[0] as HTMLElement;
    expect(within(nav).getAllByRole('link')).toHaveLength(privacyContent.sections.length - 1);
  });

  it('404: heading, ways back and the search hint', () => {
    renderWithShell(<NotFoundPage />, '/nope');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('404');
    expect(screen.getByRole('link', { name: 'Go to the Arena' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /Or search the site/ })).toBeInTheDocument();
  });
});

describe('page meta', () => {
  it('has title, canonical, indexing and share tags', () => {
    const tags = infoMeta(aboutContent);
    expect(tags).toContainEqual({ title: 'About DualMind Arena' });
    expect(tags).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: 'https://arena.dualmindlab.tech/about/',
    });
    expect(tags).toContainEqual({ name: 'robots', content: 'index, follow' });
    expect(tags.some(tag => 'property' in tag && tag.property === 'og:image')).toBe(true);
    expect(tags.some(tag => 'script:ld+json' in tag)).toBe(false);
  });

  it('adds FAQPage JSON-LD with every question on the FAQ', () => {
    const tags = infoMeta(faqContent);
    expect(tags.some(tag => 'script:ld+json' in tag)).toBe(true);
    const data = faqJsonLd(faqContent) as { mainEntity: { name: string }[] };
    expect(data.mainEntity.length).toBeGreaterThan(8);
  });

  it('keeps the 404 page out of the index', () => {
    expect(notFoundMeta()).toContainEqual({ name: 'robots', content: 'noindex' });
  });
});
