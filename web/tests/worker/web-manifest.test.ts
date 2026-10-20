import { beforeEach, describe, expect, it } from 'vitest';

import {
  loadWebManifest,
  parseWebManifest,
  resetWebManifestCache,
  WEB_MANIFEST_PATH,
} from '../../../server/web-manifest.js';
import { DIST, fakeAssets } from './fake-assets';

const HASH = 'CihokcEcBW4atb/CW/XWsvWwbTjqwQlE9nj9ii5ww5M=';
const request = new Request('https://arena.dualmindlab.tech/design/');

beforeEach(() => {
  resetWebManifestCache();
});

describe('web manifest', () => {
  it('parses a valid manifest', () => {
    const manifest = parseWebManifest({
      version: 1,
      pages: ['/design/'],
      scriptHashes: [HASH],
      connectSrc: ['https://abc.supabase.co', 'wss://abc.supabase.co'],
    });
    expect(manifest?.pages.has('/design/')).toBe(true);
    expect(manifest?.scriptHashes).toEqual([HASH]);
    expect(manifest?.connectSrc).toEqual(['https://abc.supabase.co', 'wss://abc.supabase.co']);
  });

  it('rejects anything that could weaken or break the policy', () => {
    for (const bad of [
      null,
      'x',
      { pages: 'design', scriptHashes: [] },
      { pages: ['design/'], scriptHashes: [] },
      { pages: ['/design/'], scriptHashes: ["x' 'unsafe-inline"] },
      { pages: ['/design/'], scriptHashes: [HASH], connectSrc: ['*'] },
      { pages: ['/design/'], scriptHashes: [HASH], connectSrc: ['http://insecure.test'] },
      { pages: ['/design/'], scriptHashes: [HASH], connectSrc: ["https://a.test 'unsafe-eval'"] },
    ]) {
      expect(parseWebManifest(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('loads it once per isolate from the assets', async () => {
    const assets = fakeAssets(DIST);
    expect((await loadWebManifest(request, { ASSETS: assets }))?.pages.has('/design/')).toBe(true);
    await loadWebManifest(request, { ASSETS: assets });
    expect(assets.requested.filter(path => path === WEB_MANIFEST_PATH)).toHaveLength(1);
  });

  it('returns null when it is missing, and tries again next time', async () => {
    const empty = fakeAssets({});
    expect(await loadWebManifest(request, { ASSETS: empty })).toBeNull();
    expect(await loadWebManifest(request, { ASSETS: empty })).toBeNull();
    expect(empty.requested).toEqual([WEB_MANIFEST_PATH, WEB_MANIFEST_PATH]);
    expect(await loadWebManifest(request, {})).toBeNull();
  });

  it('returns null for a manifest that is not JSON', async () => {
    const broken = fakeAssets({ [WEB_MANIFEST_PATH]: '{not json' });
    expect(await loadWebManifest(request, { ASSETS: broken })).toBeNull();
  });
});
