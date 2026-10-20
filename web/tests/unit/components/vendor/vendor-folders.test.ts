import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { credits } from '@/content/credits';

// The vendor rules from src/components/vendor/README.md, checked so they cannot drift.
const vendorDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../src/components/vendor',
);
const sources = readdirSync(vendorDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);
const docsInventory = readFileSync(
  path.resolve(vendorDir, '../../../../docs/redesign/licences.md'),
  'utf8',
);

describe('vendored components', () => {
  it('has at least the four effect sources', () => {
    expect(sources).toEqual(
      expect.arrayContaining(['aceternity', 'magicui', 'motion-primitives', 'reactbits']),
    );
  });

  it.each(sources)('%s has a licence file', source => {
    const folder = path.join(vendorDir, source);
    expect(
      existsSync(path.join(folder, 'LICENSE.md')) || existsSync(path.join(folder, 'LICENSE-NOTES.md')),
    ).toBe(true);
  });

  it.each(sources)('%s files start with the source, licence and changes header', source => {
    const folder = path.join(vendorDir, source);
    const files = readdirSync(folder).filter(name => name.endsWith('.tsx') || name.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const head = readFileSync(path.join(folder, file), 'utf8').slice(0, 600);
      expect(head.startsWith('/**'), file).toBe(true);
      expect(head, file).toMatch(/Source: https:\/\//);
      expect(head, file).toMatch(/Licence: /);
      expect(head, file).toMatch(/Our changes:|Changes:/);
      // Never paid or Pro code.
      expect(head, file).not.toMatch(/pro\.aceternity|\/pro\/|premium/i);
    }
  });

  it.each(sources)('%s is credited and listed in docs/redesign/licences.md', source => {
    expect(credits.some(credit => credit.id === source && credit.kind === 'vendored')).toBe(true);
    expect(docsInventory).toContain(`web/src/components/vendor/${source}/`);
  });
});
