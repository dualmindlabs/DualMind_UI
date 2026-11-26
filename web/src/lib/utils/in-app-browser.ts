/**
 * In-app browsers (the web views LinkedIn, Instagram, Facebook, TikTok and others open links in).
 * Google refuses OAuth inside an embedded web view (`403 disallowed_useragent`), so "Continue with
 * Google" fails there and the visitor only sees an error page. The sign-in pages detect them and
 * suggest opening the link in a real browser, and lead with the email code or GitHub.
 */

const IN_APP_PATTERNS: ReadonlyArray<readonly [name: string, pattern: RegExp]> = [
  ['Facebook', /\bFB(?:AN|AV|_IAB|IOS)\b|FBAN\/|FB4A/i],
  ['Instagram', /\bInstagram\b/i],
  ['LinkedIn', /\bLinkedInApp\b/i],
  ['TikTok', /\b(?:musical_ly|BytedanceWebview|TikTok)\b/i],
  ['Snapchat', /\bSnapchat\b/i],
  ['Twitter', /\bTwitter(?:iPhone|Android)?\b/i],
  ['Line', /\bLine\/\d/i],
  ['WeChat', /\bMicroMessenger\b/i],
  ['Pinterest', /\bPinterest\b/i],
];

/**
 * The name of the in-app browser the user agent belongs to, or null for a normal browser.
 * Android web views also announce themselves with `; wv)` and `Version/x.y` next to Chrome.
 */
export function detectInAppBrowser(userAgent: string | null | undefined): string | null {
  const ua = userAgent ?? '';
  if (ua === '') return null;
  for (const [name, pattern] of IN_APP_PATTERNS) {
    if (pattern.test(ua)) return name;
  }
  if (/\bAndroid\b/.test(ua) && /;\s*wv\)/.test(ua)) return 'an in-app browser';
  return null;
}
