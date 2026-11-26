import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// The ratings are under audit (KNOWN_ISSUES.md), so no visitor-facing text may promise that votes
// move the leaderboard or that it is "ranked by votes". This scans every source the visitor can
// read: the web app, the waitlist worker (the only page that is live today), the Worker's server
// code and the README. Share images are checked in tests/e2e/og-*-template.ts by the same words.

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);
const TEXT_FILE = /\.(tsx?|jsx?|mjs|html|md)$/;

function walk(target: string): string[] {
  const info = statSync(target);
  if (info.isFile()) return TEXT_FILE.test(target) ? [target] : [];
  return readdirSync(target)
    .filter(name => !SKIP_DIRS.has(name))
    .flatMap(name => walk(path.join(target, name)));
}

const CLAIMS: readonly RegExp[] = [
  /\bevery vote\b[^.]{0,40}\b(?:moves?|updates?|feeds?)\b/i,
  /\beach vote (?:updates|moves)\b/i,
  /\bvotes? (?:to )?(?:moves?|updates?) the leaderboard\b/i,
  /\bvote to move\b/i,
  /\bvotes feed (?:an? |the )?(?:public )?elo\b/i,
  /\bElo moves with every vote\b/i,
  /\branked by (?:blind )?votes\b/i,
  /\bpublic elo\b/i,
  /\bElo, not opinion\b/i,
  /\bwritten down for anyone to check\b/i,
  /\bhow votes turn into\b/i,
];

describe('rating claims', () => {
  const files = [
    path.join(repo, 'web', 'src'),
    path.join(repo, 'waitlist-worker', 'src'),
    path.join(repo, 'waitlist-worker', 'index.html'),
    path.join(repo, 'server'),
    path.join(repo, 'README.md'),
  ].flatMap(walk);

  it('scans the sources it is meant to scan', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some(file => file.endsWith('Hero.tsx'))).toBe(true);
    expect(files.some(file => file.endsWith('README.md'))).toBe(true);
  });

  it('no visitor-facing source claims that votes move the ratings', () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8').replace(/\s+/g, ' ');
      for (const claim of CLAIMS) {
        if (claim.test(text)) hits.push(`${path.relative(repo, file)}: ${claim}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
