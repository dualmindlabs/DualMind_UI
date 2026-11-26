import { describe, expect, it } from 'vitest';

import { buildFlags, parseFeatures } from '@/config/features';

describe('parseFeatures', () => {
  it('has every flag off, and no analytics, unless a variable is set', () => {
    expect(parseFeatures({})).toEqual({
      flags: { phoneSignIn: false, guestBattle: false, privateArena: false },
      analyticsToken: null,
    });
    // The test build sets none of them either.
    expect(buildFlags).toEqual({ phoneSignIn: false, guestBattle: false, privateArena: false });
  });

  it('reads a flag only when it is clearly on, so a typo never opens a feature', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on', true]) {
      expect(
        parseFeatures({ VITE_FEATURE_PHONE_SIGNIN: value }).flags.phoneSignIn,
        String(value),
      ).toBe(true);
    }
    for (const value of ['0', 'false', '', 'ye', 'enabled', false, undefined]) {
      expect(
        parseFeatures({ VITE_FEATURE_GUEST_BATTLE: value }).flags.guestBattle,
        String(value),
      ).toBe(false);
    }
  });

  it('keeps each flag apart', () => {
    expect(parseFeatures({ VITE_FEATURE_PRIVATE_ARENA: '1' }).flags).toEqual({
      phoneSignIn: false,
      guestBattle: false,
      privateArena: true,
    });
  });

  it('accepts an analytics token of the right shape and ignores anything else', () => {
    const token = '0123456789abcdef0123456789abcdef';
    expect(parseFeatures({ VITE_ANALYTICS_TOKEN: ` ${token} ` }).analyticsToken).toBe(token);
    for (const bad of [
      '',
      'short',
      'has space in it 0123456789',
      '<script>0123456789abcdef',
      undefined,
    ]) {
      expect(parseFeatures({ VITE_ANALYTICS_TOKEN: bad }).analyticsToken, String(bad)).toBeNull();
    }
  });
});
