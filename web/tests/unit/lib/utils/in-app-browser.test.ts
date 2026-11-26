import { describe, expect, it } from 'vitest';

import { detectInAppBrowser } from '@/lib/utils/in-app-browser';

describe('detectInAppBrowser', () => {
  it.each([
    [
      'Facebook on iOS',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0.0.0.0;FBBV/1]',
      'Facebook',
    ],
    [
      'Instagram on Android',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0 Mobile Safari/537.36 Instagram 330.0.0.40.97 Android',
      'Instagram',
    ],
    [
      'LinkedIn on iOS',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.30.1234',
      'LinkedIn',
    ],
    [
      'TikTok on Android',
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6',
      'TikTok',
    ],
    [
      'Snapchat',
      'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Snapchat/12.0',
      'Snapchat',
    ],
    [
      'a generic Android web view',
      'Mozilla/5.0 (Linux; Android 12; SM-G991B Build/SP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/115.0 Mobile Safari/537.36',
      'an in-app browser',
    ],
  ])('detects %s', (_label, userAgent, name) => {
    expect(detectInAppBrowser(userAgent)).toBe(name);
  });

  it.each([
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
    '',
  ])('leaves a normal browser alone: %s', userAgent => {
    expect(detectInAppBrowser(userAgent)).toBeNull();
  });

  it('handles a missing user agent', () => {
    expect(detectInAppBrowser(undefined)).toBeNull();
    expect(detectInAppBrowser(null)).toBeNull();
  });
});
