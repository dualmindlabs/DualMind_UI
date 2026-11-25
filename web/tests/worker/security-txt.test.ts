import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// RFC 9116: /.well-known/security.txt needs at least one Contact and an Expires date.
const text = readFileSync(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../public/.well-known/security.txt',
  ),
  'utf8',
);

describe('security.txt', () => {
  it('has the required fields and points at the real policy', () => {
    expect(text).toMatch(/^Contact: (https:\/\/|mailto:)\S+$/m);
    expect(text).toMatch(/^Expires: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/m);
    expect(text).toContain(
      'Policy: https://github.com/dualmindlabs/DualMind_UI/blob/master/SECURITY.md',
    );
    expect(text).toContain('Canonical: https://arena.dualmindlab.tech/.well-known/security.txt');
  });
});
