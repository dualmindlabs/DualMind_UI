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
  /** Leaves the site (GitHub) or opens the mail app (mailto:); not a trailing-slash path. */
  external?: boolean;
}

/** The public source repository. */
export const GITHUB_URL = 'https://github.com/dualmindlabs/DualMind_UI';
/** The organization's own site (the Organization JSON-LD `url`, the built-by strip). */
export const ORG_SITE_URL = 'https://dualmindlab.tech';
/** The organization's GitHub page (the Organization JSON-LD `sameAs`, the built-by strip). */
export const ORG_GITHUB_URL = 'https://github.com/dualmindlabs';
/** The public changelog: what changed and when, in the repository. */
export const CHANGELOG_URL = `${GITHUB_URL}/blob/master/CHANGELOG.md`;
/** The support address already used across the site (FAQ, privacy page). */
export const SUPPORT_EMAIL = 'support@dualmindlab.tech';

/**
 * The Grievance Officer contact that India's IT Rules 2021 (rule 3(2)) ask an intermediary to
 * publish. OWNER TO CONFIRM: no officer has been named yet and the mailbox may not exist. The
 * name is an empty string until the owner sets a real one: the Terms then print no officer line
 * (never a made-up person, never a visible placeholder). Set it before launch.
 */
export const GRIEVANCE_EMAIL = 'grievance@dualmindlab.tech';
export const GRIEVANCE_OFFICER_NAME = '' as string;

/** A mailto link that reports one shared page; the share id goes into the subject and body. */
export function reportShareHref(shareId: string, pageUrl: string): string {
  const subject = `Report shared page ${shareId}`;
  const body = `I am reporting the shared page ${pageUrl}\n\nWhat is wrong with it:\n`;
  return `mailto:${GRIEVANCE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * The header navigation (design-direction.md section 12, global shell). Four links on purpose:
 * the signed-in arena header shows them too, and a fifth overflows it between 1024 and 1280 px
 * (arena-flow.spec.ts). Pricing is in the footer, the landing page's closing section and the
 * sitemap.
 */
export const primaryNav: readonly SiteLink[] = [
  { label: 'Arena', href: '/', description: 'Ask once, compare two anonymous models' },
  { label: 'Leaderboard', href: '/leaderboard/', description: 'Model rankings' },
  { label: 'Models', href: '/models/', description: 'Every model in the Arena' },
  { label: 'How it works', href: '/how-it-works/', description: 'Battles, votes and ratings' },
];

export const signInLink: SiteLink = { label: 'Sign in', href: '/login/' };

/** Signed-in only (the account menu and the command palette): profile, appearance, data. */
export const settingsLink: SiteLink = {
  label: 'Settings',
  href: '/settings/',
  description: 'Profile, theme, motion, shortcuts and your data',
};

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
      { label: 'Pricing', href: '/pricing/' },
      { label: 'API', href: '/developers/' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about/' },
      { label: 'How it works', href: '/how-it-works/' },
      { label: 'FAQ', href: '/faq/' },
      { label: 'Credits', href: '/credits/' },
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
  // No Status link until a status page exists.
  {
    title: 'Connect',
    links: [
      { label: 'GitHub', href: GITHUB_URL, external: true },
      { label: 'Contact', href: `mailto:${SUPPORT_EMAIL}`, external: true },
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
