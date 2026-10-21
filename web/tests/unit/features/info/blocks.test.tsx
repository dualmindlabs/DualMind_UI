import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BlockList } from '@/features/info/components/block-list';
import type { Block } from '@/features/info/content';
import { faqId, groupBlocks } from '@/features/info/lib/blocks';
import { formatDate, slugify } from '@/features/info/lib/format';

const renderBlocks = (blocks: Block[]) => render(<BlockList blocks={blocks} />);

describe('block renderers', () => {
  it('renders a paragraph and links email addresses', () => {
    renderBlocks([{ type: 'paragraph', text: 'Write to privacy@dualmindlab.tech today.' }]);
    expect(screen.getByText(/Write to/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'privacy@dualmindlab.tech' })).toHaveAttribute(
      'href',
      'mailto:privacy@dualmindlab.tech',
    );
  });

  it('renders bulleted and numbered lists', () => {
    renderBlocks([
      { type: 'list', items: ['one', 'two'] },
      { type: 'list', ordered: true, items: ['first', 'second', 'third'] },
    ]);
    const lists = screen.getAllByRole('list');
    expect(lists[0]?.tagName).toBe('UL');
    expect(within(lists[0] as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
    expect(lists[1]?.tagName).toBe('OL');
    expect(within(lists[1] as HTMLElement).getAllByRole('listitem')).toHaveLength(3);
  });

  it.each([
    ['summary', 'Summary'],
    ['note', 'Note'],
    ['warning', 'Warning'],
  ] as const)('renders a %s callout with a text label, not only colour', (tone, label) => {
    renderBlocks([{ type: 'callout', tone, text: 'Body text' }]);
    const note = screen.getByRole('note');
    expect(note).toHaveAttribute('data-tone', tone);
    expect(note).toHaveTextContent(label);
    expect(note).toHaveTextContent('Body text');
  });

  it('uses the callout title when there is one', () => {
    renderBlocks([{ type: 'callout', tone: 'note', title: 'Expected score', text: 'E(A)' }]);
    expect(screen.getByRole('note', { name: 'Expected score' })).toBeInTheDocument();
  });

  it('renders steps as an ordered list with a heading each', () => {
    renderBlocks([
      {
        type: 'steps',
        items: [
          { title: 'Ask', body: 'Write a prompt.' },
          { title: 'Vote', body: 'Pick one.' },
        ],
      },
    ]);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 3, name: 'Ask' })).toBeInTheDocument();
    expect(screen.getByText('Pick one.')).toBeInTheDocument();
  });

  it('renders definitions as a description list', () => {
    const { container } = renderBlocks([
      { type: 'definitions', items: [{ term: 'Battle', description: 'Two anonymous models.' }] },
    ]);
    expect(container.querySelector('dt')).toHaveTextContent('Battle');
    expect(container.querySelector('dd')).toHaveTextContent('Two anonymous models.');
  });

  it('groups consecutive questions into one accordion with an id each', () => {
    renderBlocks([
      { type: 'paragraph', text: 'Intro' },
      { type: 'faq', question: 'Is it free?', answer: ['Yes.', 'For now.'] },
      { type: 'faq', question: 'Do I need an account?', answer: ['Yes.'] },
    ]);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map(button => button.textContent)).toEqual([
      'Is it free?',
      'Do I need an account?',
    ]);
    expect(document.getElementById('is-it-free')).not.toBeNull();
    expect(document.getElementById('do-i-need-an-account')).not.toBeNull();
    // Answers are in the DOM even while closed.
    expect(document.body.textContent).toContain('For now.');
  });
});

describe('helpers', () => {
  it('groups only consecutive faq blocks', () => {
    const faq = (question: string): Block => ({ type: 'faq', question, answer: ['a'] });
    const groups = groupBlocks([faq('a?'), faq('b?'), { type: 'paragraph', text: 'x' }, faq('c?')]);
    expect(groups.map(group => group.kind)).toEqual(['faq', 'block', 'faq']);
  });

  it('makes kebab-case ids from questions', () => {
    expect(faqId('Do I need an account?')).toBe('do-i-need-an-account');
    expect(slugify("What's a tie?  ")).toBe('whats-a-tie');
  });

  it('formats ISO dates without Intl', () => {
    expect(formatDate('2026-10-20')).toBe('20 October 2026');
    expect(formatDate('2026-01-05')).toBe('5 January 2026');
    expect(formatDate('not a date')).toBe('not a date');
  });
});
