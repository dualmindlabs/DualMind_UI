import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  type Block,
  dataContent,
  DataPage,
  infoMeta,
  MAX_DESCRIPTION_LENGTH,
} from '@/features/info';

import { renderWithShell } from '../../render-with-shell';

// The data license is split on purpose (cycle 5): numbers are ours, answers are the providers'.

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const SIGNAL = 'search=yes, ai-input=yes, ai-train=no';

function text(block: Block): string[] {
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

const section = (id: string) => dataContent.sections.find(item => item.id === id)!;
const sectionText = (id: string) => section(id).blocks.flatMap(text).join(' ');

describe('data license content', () => {
  it('has a summary callout, a date and a short description', () => {
    expect(dataContent.updated).toBe('2026-11-26');
    expect(
      section('summary').blocks.some(block => block.type === 'callout' && block.tone === 'summary'),
    ).toBe(true);
    expect(dataContent.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    expect(dataContent.description.length).toBeGreaterThan(40);
  });

  it('licenses the aggregate numbers CC BY 4.0, with credit', () => {
    expect(sectionText('leaderboard-numbers')).toMatch(/CC BY 4\.0/);
    expect(sectionText('leaderboard-numbers')).toMatch(/credit/i);
  });

  it('never gives model answers a Creative Commons license', () => {
    const answers = sectionText('model-answers');
    expect(answers).toMatch(/provider/i);
    expect(answers).toMatch(/analysis and evaluation/i);
    expect(answers).toMatch(/cannot license/i);
    // CC BY appears only to say it does not apply.
    expect(answers.replace(/Not CC BY/g, '')).not.toMatch(/CC BY/);
    expect(answers).not.toMatch(/\bCC[- ]BY\b[^.]*\banswers?\b[^.]*\b(?:are|is) licensed\b/i);
  });

  it('publishes no prompts today and promises a release only with consent', () => {
    const prompts = sectionText('prompts');
    expect(prompts).toMatch(/do not publish any prompts today/i);
    expect(prompts).toMatch(/opted in/i);
  });

  it('states the same Content-Signal that robots.txt carries', () => {
    expect(sectionText('ai-use')).toContain(`Content-Signal line: ${SIGNAL}`);
    expect(readFileSync(path.join(repo, 'build.js'), 'utf8')).toContain(
      `const CONTENT_SIGNAL = '${SIGNAL}'`,
    );
    expect(readFileSync(path.join(repo, 'waitlist-worker/public/robots.txt'), 'utf8')).toContain(
      `Content-Signal: ${SIGNAL}`,
    );
  });

  it('is indexable, with the canonical URL /data/', () => {
    const tags = infoMeta(dataContent);
    expect(tags).toContainEqual({ name: 'robots', content: 'index, follow' });
    expect(JSON.stringify(tags)).toContain('/data/');
  });
});

describe('DataPage', () => {
  it('renders the heading and the answers warning', () => {
    renderWithShell(<DataPage />, '/data/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Our data,');
    expect(screen.getByRole('heading', { name: 'Model answers' })).toBeVisible();
    expect(screen.getByText('Not CC BY')).toBeVisible();
  });
});
