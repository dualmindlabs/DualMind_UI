import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Guards the cleanup that moved the classic pages into legacy/: the config and docs at the repo
// root must not point at files that no longer exist.
const root = resolve(__dirname, '../../..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('repo references after the legacy move', () => {
  it('serve.json rewrites only to files that exist', () => {
    const cfg = JSON.parse(read('serve.json')) as { rewrites?: { destination: string }[] };
    for (const r of cfg.rewrites ?? []) {
      expect(existsSync(resolve(root, r.destination.replace(/^\//, ''))), r.destination).toBe(true);
    }
  });

  it('the lint script ignores no deleted file', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts.lint).not.toContain('mock-api-server');
  });

  it('the Playwright testDir exists and holds a spec', () => {
    const cfg = read('playwright.config.js');
    const dir = /testDir:\s*'([^']+)'/.exec(cfg)?.[1];
    expect(dir).toBeTruthy();
    expect(existsSync(resolve(root, dir!, 'auth-flow-redesign.spec.js'))).toBe(true);
  });

  it.each(['AGENTS.md', 'CLAUDE.md', '.cursorrules'])(
    '%s names moved files only under legacy/',
    file => {
      const text = read(file);
      expect(text).not.toMatch(
        /share\/index\.html\s+\(SPA route\)|\/share\/\*\s+→\s+share\/index\.html/,
      );
      for (const name of ['login-modern.html', 'performance-monitor.js', 'auth-complete.js']) {
        for (const line of text.split('\n').filter(l => l.includes(name))) {
          expect(line, `${file}: ${name}`).toMatch(/legacy|retired/);
        }
      }
      expect(text).not.toContain('node build-deploy.js');
    },
  );
});
