import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// The structure rules from docs/architecture.md, checked so they cannot drift silently.
const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? [full, ...walk(full)] : [full];
  });
}

const entries = walk(srcDir).map(full => path.relative(srcDir, full).split(path.sep).join('/'));
const kebab = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('src/ conventions', () => {
  it('uses kebab-case file and folder names', () => {
    const offenders = entries.filter(entry => {
      const name = entry.split('/').pop() ?? '';
      if (name === 'README.md') return false;
      const stem = name.replace(/(\.d)?\.(tsx?|css|md)$/, '');
      return !kebab.test(stem);
    });
    expect(offenders).toEqual([]);
  });

  it('names hooks use-*.ts', () => {
    const hooks = entries.filter(entry => /(^|\/)hooks\/[^/]+\.tsx?$/.test(entry));
    expect(hooks.filter(entry => !/\/use-[a-z0-9-]+\.tsx?$/.test(`/${entry}`))).toEqual([]);
  });

  it('gives every feature an index.ts public API', () => {
    const features = readdirSync(path.join(srcDir, 'features')).filter(name =>
      statSync(path.join(srcDir, 'features', name)).isDirectory(),
    );
    expect(features.length).toBeGreaterThan(0);
    for (const feature of features) {
      expect(existsSync(path.join(srcDir, 'features', feature, 'index.ts')), feature).toBe(true);
    }
  });

  it('documents every top-level folder with a README.md', () => {
    const folders = readdirSync(srcDir).filter(name =>
      statSync(path.join(srcDir, name)).isDirectory(),
    );
    for (const folder of folders) {
      expect(existsSync(path.join(srcDir, folder, 'README.md')), folder).toBe(true);
    }
  });

  it('has no barrel file in components/ui', () => {
    expect(existsSync(path.join(srcDir, 'components/ui/index.ts'))).toBe(false);
  });
});
