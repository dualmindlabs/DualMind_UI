/**
 * The site's navigation: one list for the header, the mobile menu, the footer and the command
 * palette, so they never drift apart. Paths are the exact public URLs (legacy pages included),
 * with the trailing slash the Worker serves them under.
 */

export interface SiteLink {
  label: string;
  href: string;
  /** One line for the command palette and the mobile menu. */
  description?: string;
}

/** The header navigation (design-direction.md section 12, global shell). */
export const primaryNav: readonly SiteLink[] = [
  { label: 'Arena', href: '/', description: 'Ask once, compare two anonymous models' },
  { label: 'Leaderboard', href: '/leaderboard/', description: 'Rankings from every vote' },
  { label: 'Models', href: '/models/', description: 'Every model in the Arena' },
  { label: 'How it works', href: '/how-it-works/', description: 'Battles, votes and ratings' },
];

export const signInLink: SiteLink = { label: 'Sign in', href: '/login/' };

export interface FooterColumn {
  title: string;
  links: readonly SiteLink[];
}

export const footerColumns: readonly FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Arena', href: '/' },
      { label: 'Leaderboard', href: '/leaderboard/' },
      { label: 'Models', href: '/models/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'How it works', href: '/how-it-works/' },
      { label: 'FAQ', href: '/faq/' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy/' },
      { label: 'Terms', href: '/terms/' },
      { label: 'Cookies', href: '/cookies/' },
    ],
  },
];

function withSlash(path: string): string {
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Whether a nav link is the current page: `/` only matches the home page; any other link also
 * matches its sub-pages (`/models/` is active on `/models/gpt-x/`). Trailing slashes are ignored.
 */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '';
  return withSlash(pathname).startsWith(withSlash(href));
}
