import { describe, expect, it } from 'vitest';
import { bindingNameFor, enabledBindings, environmentFor, isProductionHost, pickBinding, PRODUCTION_HOST } from '../../server/v2/bindings.ts';
import type { Env } from '../../server/v2/env.ts';

const env: Env = {
  DB: 'prod-db',
  DB_PREVIEW: 'preview-db',
  CACHE: 'prod-cache',
  CACHE_PREVIEW: 'preview-cache',
  EVENTS: 'prod-events',
  EVENTS_PREVIEW: 'preview-events',
  PUBLIC_BUCKET: 'prod-bucket',
  PUBLIC_BUCKET_PREVIEW: 'preview-bucket',
};

describe('binding chooser', () => {
  it('picks production bindings only for the production host', () => {
    expect(PRODUCTION_HOST).toBe('arena.dualmindlab.tech');
    expect(pickBinding(env, 'arena.dualmindlab.tech', 'DB')).toBe('prod-db');
    expect(pickBinding(env, 'ARENA.DualMindLab.tech', 'CACHE')).toBe('prod-cache');
    expect(pickBinding(env, 'arena.dualmindlab.tech', 'EVENTS')).toBe('prod-events');
    expect(pickBinding(env, 'arena.dualmindlab.tech', 'PUBLIC_BUCKET')).toBe('prod-bucket');
    expect(environmentFor('arena.dualmindlab.tech')).toBe('production');
  });

  it('picks preview bindings for every other host, including look-alikes', () => {
    for (const host of [
      'feat-x-dualmind-arena.creharsh.workers.dev',
      'dualmind-arena.creharsh.workers.dev',
      'localhost',
      '127.0.0.1',
      'example.com',
      'arena.dualmindlab.tech.evil.com',
      'evil-arena.dualmindlab.tech',
      'www.arena.dualmindlab.tech',
      'dualmindlab.tech',
      '',
    ]) {
      expect(isProductionHost(host), host).toBe(false);
      expect(pickBinding(env, host, 'DB'), host).toBe('preview-db');
      expect(pickBinding(env, host, 'CACHE'), host).toBe('preview-cache');
      expect(pickBinding(env, host, 'EVENTS'), host).toBe('preview-events');
      expect(pickBinding(env, host, 'PUBLIC_BUCKET'), host).toBe('preview-bucket');
      expect(environmentFor(host)).toBe('preview');
    }
    expect(bindingNameFor('localhost', 'DB')).toBe('DB_PREVIEW');
  });

  it('never falls back from the preview binding to the production one', () => {
    expect(pickBinding({ DB: 'prod-db' }, 'localhost', 'DB')).toBeUndefined();
  });

  it('reports which bindings exist for the host, names only', () => {
    expect(enabledBindings({ DB_PREVIEW: 'x' }, 'localhost')).toEqual({ DB: true, CACHE: false, EVENTS: false, PUBLIC_BUCKET: false });
    expect(enabledBindings({ DB_PREVIEW: 'x' }, 'arena.dualmindlab.tech')).toEqual({ DB: false, CACHE: false, EVENTS: false, PUBLIC_BUCKET: false });
  });
});
