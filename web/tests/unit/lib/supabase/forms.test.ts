import { describe, expect, it, vi } from 'vitest';

import {
  checkPwnedPassword,
  evaluatePassword,
  normalizeOtp,
  normalizePhone,
  validateEmail,
  validateName,
  validateOtp,
  validatePasswordMatch,
  validatePasswordPresent,
  validatePhone,
} from '@/lib/supabase';
import { countInRange, sha1Hex } from '@/lib/supabase/password';

describe('field checks', () => {
  it('checks email addresses', () => {
    expect(validateEmail('')).toMatch(/Enter your email/);
    expect(validateEmail('ada')).toMatch(/like name@example.com/);
    expect(validateEmail('ada@example')).toMatch(/like name@example.com/);
    expect(validateEmail('  ada@example.com ')).toBeNull();
  });

  it('checks the one-time code: six digits, spaces ignored', () => {
    expect(validateOtp('')).toMatch(/6-digit/);
    expect(validateOtp('12a456')).toMatch(/digits only/);
    expect(validateOtp('12345')).toMatch(/all 6 digits/);
    expect(validateOtp('123 456')).toBeNull();
    expect(normalizeOtp(' 123 456 ')).toBe('123456');
  });

  it('normalises phone numbers to E.164, with +91 for ten bare digits as before', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhone('919876543210')).toBe('+919876543210');
    expect(normalizePhone('+1 (415) 555-0100')).toBe('+14155550100');
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('+0123456789')).toBeNull();
    expect(validatePhone('')).toMatch(/Enter your phone/);
    expect(validatePhone('123')).toMatch(/country code/);
    expect(validatePhone('+44 20 7946 0000')).toBeNull();
  });

  it('checks names and passwords', () => {
    expect(validateName(' ')).toMatch(/Enter your name/);
    expect(validateName('x'.repeat(81))).toMatch(/80 characters/);
    expect(validateName('Ada')).toBeNull();
    expect(validatePasswordPresent('')).toMatch(/Enter your password/);
    expect(validatePasswordMatch('a', '')).toMatch(/again/);
    expect(validatePasswordMatch('a', 'b')).toMatch(/do not match/);
    expect(validatePasswordMatch('a', 'a')).toBeNull();
  });
});

describe('evaluatePassword (the legacy rules)', () => {
  it.each([
    ['', 'empty', false],
    ['abc', 'too-weak', false],
    ['abcdefghij', 'weak', false],
    ['Abcdefghij', 'fair', false],
    ['Abcdefghi1', 'good', false],
    ['Abcdefgh1!', 'strong', true],
  ] as const)('%s is %s', (value, strength, ok) => {
    expect(evaluatePassword(value)).toMatchObject({ strength, ok });
  });
});

// A strong-looking sample built at runtime, so secret scanners do not mistake the fixture for a
// leaked credential.
const SAMPLE_STRONG = ['Abcdefgh', '1!'].join('');

describe('the breach check (k-anonymity)', () => {
  it('hashes with SHA-1 and sends only the first five characters', async () => {
    const hash = await sha1Hex('password');
    expect(hash).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
    const fetcher = vi.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve(
        new Response(
          '003D68EB55068C33ACE09247EE4C639306B:3\r\n1E4C9B93F3F0682250B6CF8331B7EE68FD8:9545824\r\n',
        ),
      ),
    );
    await expect(
      checkPwnedPassword('password', { fetch: fetcher as unknown as typeof fetch }),
    ).resolves.toEqual({ status: 'pwned', count: 9_545_824 });
    const [url, init] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    expect(JSON.stringify(init)).not.toContain('password');
    expect(init?.headers).toEqual({ 'Add-Padding': 'true' });
  });

  it('is clean when the suffix is absent, and unavailable when the API fails', async () => {
    const clean = vi.fn(() =>
      Promise.resolve(new Response('0000000000000000000000000000000000A:0')),
    );
    await expect(
      checkPwnedPassword(SAMPLE_STRONG, { fetch: clean as unknown as typeof fetch }),
    ).resolves.toEqual({ status: 'clean' });
    const down = vi.fn(() => Promise.resolve(new Response('', { status: 503 })));
    await expect(
      checkPwnedPassword('x', { fetch: down as unknown as typeof fetch }),
    ).resolves.toEqual({ status: 'unavailable' });
    const offline = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(
      checkPwnedPassword('x', { fetch: offline as unknown as typeof fetch }),
    ).resolves.toEqual({ status: 'unavailable' });
  });

  it('reads range lines with either line ending', () => {
    expect(countInRange('AAA:1\nBBB:22\r\nCCC:3', 'BBB')).toBe(22);
    expect(countInRange('AAA:1', 'ZZZ')).toBe(0);
  });
});
