import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseMethodology } from '@/features/leaderboard/lib/methodology-text';

const text = readFileSync(
  path.resolve(process.cwd(), 'tests/fixtures/api/crowd-methodology.txt'),
  'utf8',
);

describe('parseMethodology', () => {
  it('reads the method id from the title and drops the title', () => {
    const parsed = parseMethodology(text);
    expect(parsed.methodId).toBe('bt-v1');
    expect(parsed.blocks[0]).toEqual({ kind: 'heading', text: 'What a rating is' });
  });

  it('makes a heading of each short single line and a paragraph of the rest', () => {
    const { blocks } = parseMethodology(text);
    expect(blocks.filter(block => block.kind === 'heading').map(block => block.text)).toEqual([
      'What a rating is',
      'Scale',
      'Confidence intervals',
      'Rank',
      'Which votes count',
      'Few votes',
      'Same input, same output',
      'Compatibility',
    ]);
    const paragraph = blocks.find(block => block.text.startsWith('rating = 1000'));
    expect(paragraph?.kind).toBe('paragraph');
    expect(paragraph?.text).not.toContain('\n');
  });

  it('is tolerant: empty text, CRLF and a body without a title', () => {
    expect(parseMethodology('')).toEqual({ methodId: null, blocks: [] });
    expect(parseMethodology('Scale\r\n\r\nOne line.\r\nTwo lines.')).toEqual({
      methodId: null,
      blocks: [
        { kind: 'heading', text: 'Scale' },
        { kind: 'paragraph', text: 'One line. Two lines.' },
      ],
    });
  });
});
