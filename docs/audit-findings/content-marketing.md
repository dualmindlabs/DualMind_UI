# Info Pages, Marketing & SEO Audit

**Audit Date:** 2026-08-14
**Auditor:** Claude Code
**Domain:** Static marketing pages, SEO metadata, accessibility, navigation consistency, shared-thread UX, legal pages, duplication.

---

## Scope (Files Reviewed)

**Live source pages (current design system):**
- `index.html`
- `about/index.html`
- `faq/index.html`
- `how-it-works/index.html`
- `cookies/index.html`
- `privacy/index.html`
- `terms/index.html`
- `leaderboard/index.html`
- `models/index.html`
- `share/index.html`
- `404.html`
- `sitemap.xml`
- `robots.txt`
- `ads.txt`
- `css/info-pages.css`
- `js/leaderboardPage.js`
- `components/SharedThreadView.js`

**Routing / build files:**
- `worker.js`
- `build.js`
- `build-deploy.js`
- `package.json`

**Orphaned / duplicative directories reviewed for dead-code detection:**
- `about/about/index.html`
- `careers/index.html`
- `careers/careers/index.html`
- `how-it-works/how-it-works/index.html`
- `old-html-backup/*` (`index.html`, `about/index.html`, `how-it-works/index.html`, `careers/index.html`, `login/`, `theme.js`, `app.js`, `styles.css`, `login/style.css`)
- `dist/`, `deploy_build/` (build-output duplicates)

---

## Overview

The marketing/info domain is a set of hand-written static HTML pages served by the Cloudflare Worker in `worker.js`. The current canonical pages (`about`, `faq`, `how-it-works`, `privacy`, `terms`, `cookies`) share a single stylesheet, `css/info-pages.css`, and a consistent sticky-header + footer pattern, indicating an intentional consolidation pass. SEO metadata (title, description, canonical, robots) is present on these pages.

However, the domain has a significant amount of **orphaned and duplicated content** left over from earlier iterations (Duel_mind / LMArena copy), and several **production-launch blockers** around broken social images, inconsistent design, legal copywriting, and stale build artifacts being deployed.

---

## Strengths

1. **Canonical info pages are unified.** `about/index.html`, `faq/index.html`, `how-it-works/index.html`, `privacy/index.html`, `terms/index.html`, and `cookies/index.html` all load `css/info-pages.css` and use the same header/footer components, producing a consistent DualMind branded experience.
2. **SEO basics are in place.** Each canonical info page has `<title>`, `<meta name="description">`, `<meta name="robots" content="index, follow">`, and `<link rel="canonical">` pointing to `https://arena.dualmindlab.tech/<page>/`.
3. **Sitemap and robots.txt are dynamic.** `worker.js` serves generated `sitemap.xml` and `robots.txt` with hostname substitution, which is maintainable for a multi-env deployment pattern.
4. **Shared thread flow is deliberate.** `share/index.html` + `components/SharedThreadView.js` implements a read-only, public, auth-free thread view with DOMPurify sanitization and support for both `/share/<id>` and query-param fallbacks.
5. **Legal pages are detailed.** Privacy, Terms, and Cookies pages contain jurisdiction-aware language (international transfers, cookie consent, data rights), making them a reasonable starting point for compliance review.
6. **Accessibility touches exist.** Main `index.html` includes a `skip-link`; FAQ accordion uses semantic `<button>` elements; legal pages use TOC sidebars with `IntersectionObserver` highlighting.

---

## Dead / Unused / Duplicate Files

| File / Directory | Why it appears unused | Confidence | Recommended Action |
|---|---|---|---|
| `careers/index.html` | Only referenced in `sitemap.xml`, `worker.js`, and `build.js`; **no live navigation link** exists in any canonical page or the main app. Content still says "LMArena" and lists fake Bay Area jobs. | High | Delete or replace with a minimal "We're not hiring" placeholder. If retained, rebrand and link it from the footer of every info page and `index.html`. |
| `careers/careers/index.html` | Exact duplicate at a nonsensical nested path; contains the same LMArena/Duel_mind content as `careers/index.html`. Referenced nowhere except by `build.js` copy. | High | Delete. |
| `about/about/index.html` | Duplicate of old Duel_mind/LMArena about page at a nested path. Links to `../style.css` and `../index.html`, which means it cannot resolve assets correctly from `/about/about/`. Referenced nowhere. | High | Delete. |
| `how-it-works/how-it-works/index.html` | Duplicate of old LMArena how-it-works page at nested path. Same incorrect relative-asset issue. Referenced nowhere. | High | Delete. |
| `old-html-backup/` (entire dir) | Contains the original Duel_mind/LMArena UI (`index.html`, `app.js`, `styles.css`, `login/`, etc.). Only mention in source control is `package.json` `lint` ignore pattern. It is served by `npm run dev` if present, creating a public shadow site under `/old-html-backup/`. | High | Delete or move out of repository root (e.g. an `archive/` branch or local backup). Do not deploy it. |
| `dist/` and `deploy_build/` | Generated build outputs that are checked into the repo or produced by `build.js`/`build-deploy.js`. They duplicate every source file, including the dead directories above, and are what Cloudflare actually serves via `ASSETS`. | High | Add to `.gitignore` (if not already) and remove from tracking; ensure CI builds them at deploy time. |
| `js/api-client.js` | Deprecated shim (per `CLAUDE.md`) in the JS layer that supports SharedThreadView/leaderboard; not directly in scope of info pages but relied on by some paths. | Medium | Verify no import remains, then delete. |

### Duplicate analysis summary

Three canonical pages have **nested duplicate directories** that are copy-paste residuals from the LMArena/Duel_mind rebrand:

- `about/` vs `about/about/`
- `how-it-works/` vs `how-it-works/how-it-works/`
- `careers/` vs `careers/careers/`

These nested copies are **not routed to** by `worker.js` (the directory-fallback logic would only serve them for URLs like `/about/about/`, which are never linked). They still get copied into `dist/` by `build.js` and are therefore deployable, creating:

- Broken-brand pages indexed by search engines if accidentally discovered
- Broken relative asset links (`../style.css` does not exist at project root; the live files are in `css/`)
- Larger deployments than necessary

---

## Issues List

### Critical

#### 1. Missing Open Graph image causes broken social sharing
- **Severity:** Critical
- **Files:** `index.html:19`, `leaderboard/index.html:16`, `login-modern.html` (assumed), `models/index.html` (none, also an issue)
- **Description:** Pages reference `https://arena.dualmindlab.tech/assets/og-image.png`. A glob search for `og-image*` returned **no files** in the repository.
- **Why it matters:** Social sharing cards will show a broken image. For a SaaS launch that depends on organic growth and shareability, this is a brand-damaging, first-impression failure on Twitter/X, LinkedIn, Slack, etc.

#### 2. Careers page is live but invisible and still branded for LMArena
- **Severity:** Critical
- **Files:** `careers/index.html`, `careers/careers/index.html`, `sitemap.xml:40`, `worker.js:156`, `build.js:30`
- **Description:** `/careers/` is served and sitemap-linked, yet contains old LMArena copy, fake job listings, and is not linked from any live navigation. It is a launch blocker: a public page that claims to represent the company but is stale and unfindable.
- **Why it matters:** Legal/trust risk (false job postings) and SEO confusion (Google may index it because it's in the sitemap).

### High

#### 3. Duplicate legacy pages are being deployed
- **Severity:** High
- **Files:** `about/about/index.html`, `how-it-works/how-it-works/index.html`, `careers/careers/index.html`, `old-html-backup/*`, plus `dist/` and `deploy_build/`
- **Description:** Legacy LMArena/Duel_mind content is copied into build artifacts and could be served, indexed, or mistaken for canonical content.
- **Why it matters:** Duplicate content harms SEO cannibalization and creates brand/trust issues if users land on stale pages.

#### 4. Inconsistent design system between info pages and standalone marketing pages
- **Severity:** High
- **Files:** `leaderboard/index.html:28-34`, `models/index.html:14-20`, `careers/index.html:11-17`
- **Description:** `leaderboard/`, `models/`, and `careers/` load `Inter` font, `styles.css`, `auth-styles.css`, and `theme.js`, while canonical info pages use `Outfit` + `info-pages.css`. This results in visually different headers, colors, and typography.
- **Why it matters:** Undermines brand consistency and violates the established rule in `CLAUDE.md`: "Never reference `Inter`" and "Use `var(--color-cyan)`".

#### 5. Privacy Policy claims features the app may not implement
- **Severity:** High
- **Files:** `privacy/index.html:88-101`, `cookies/index.html:89-93`
- **Description:** Policy lists language settings, A/B testing, marketing opt-out, and usage analytics. There is no evidence of a cookie-consent banner, analytics integration, or marketing email system in the current codebase.
- **Why it matters:** Regulators and enterprise customers compare legal text to actual behavior. Mismatches create privacy-policy-enforcement liability.

#### 6. Sitemap is inconsistent with source sitemap file
- **Severity:** High
- **Files:** `sitemap.xml` vs `worker.js:114-191`
- **Description:** The static `sitemap.xml` at project root omits `privacy/`, `terms/`, `cookies/`, and `login/`. The worker generates a richer sitemap that includes them plus `careers/`.
- **Why it matters:** Search engines fetching `/sitemap.xml` from the worker get a different URL set than developers see in source control, making audits and caching debugging difficult.

#### 7. `share/index.html` uses inline styles and hardcodes brand colors
- **Severity:** High
- **Files:** `share/index.html:46-68`
- **Description:** Loading overlay uses inline `style` attributes with `#4AABC2`, which contradicts the design-token rule.
- **Why it matters:** Makes shared threads harder to maintain/brand and is flagged as a convention violation in `CLAUDE.md`.

### Medium

#### 8. Models page is orphaned and contains static, possibly inaccurate claims
- **Severity:** Medium
- **Files:** `models/index.html`, `js/leaderboardPage.js`
- **Description:** `/models/` is in the sitemap but not linked from the main app header, sidebar, or info-page nav. It lists specific models (GPT-4, Claude 3, Gemini 1.5, Llama 3, Mistral Large) with static strengths/limitations that can become outdated quickly.
- **Why it matters:** Stale model marketing copy is bad for credibility; also wastes engineering effort if no user can find it.

#### 9. Leaderboard standalone page is not reachable from in-app navigation
- **Severity:** Medium
- **Files:** `components/Sidebar.js:109`, `js/ui/app.js:1843-1880`, `leaderboard/index.html`
- **Description:** Sidebar "Leaderboard" opens a modal (`LeaderboardModal`) instead of navigating to `/leaderboard/`. The standalone page exists and is sitemap-indexed, but the primary CTA does not route there.
- **Why it matters:** Two leaderboard implementations (modal + page) fragment analytics, caching, and SEO; users cannot share/link a leaderboard URL from the app.

#### 10. Footer navigation inconsistency across info pages
- **Severity:** Medium
- **Files:** `about/index.html:34-36`, `faq/index.html:34-36`, `how-it-works/index.html:34-36` vs `privacy/index.html:34-36`, `terms/index.html:34-36`, `cookies/index.html:34-36`
- **Description:** Marketing pages (about, faq, how-it-works) show "How It Works" + "FAQ" + "Try Arena" header links. Legal pages show "Terms" + "Cookies/Privacy" + "Arena". The header therefore changes its information architecture depending on the page.
- **Why it matters:** Confusing navigation; users looking for legal pages from marketing pages (or vice versa) have inconsistent paths.

#### 11. Social metadata missing on several marketing pages
- **Severity:** Medium
- **Files:** `about/index.html`, `faq/index.html`, `how-it-works/index.html`, `privacy/index.html`, `terms/index.html`, `cookies/index.html`, `models/index.html`
- **Description:** Only `leaderboard/index.html` has Open Graph/Twitter cards. Canonical info pages and models page have no `og:*` or `twitter:*` tags.
- **Why it matters:** Shared links to these pages will render without rich previews, reducing click-throughs from organic social.

### Low

#### 12. `404.html` is styled inline and not using design tokens
- **Severity:** Low
- **Files:** `404.html`
- **Description:** `404.html` is a self-contained page with all CSS inline, hardcoding `#4AABC2` and `#CB9275`. It also loads Google Fonts/RemixIcon separately.
- **Why it matters:** Acceptable for an error page, but it duplicates brand values and won't receive token updates. Minor maintainability issue.

#### 13. `careers/` and `models/` load unused `auth-styles.css` and `theme.js`
- **Severity:** Low
- **Files:** `careers/index.html:16-17`, `models/index.html:19-20`, `leaderboard/index.html:33-35`
- **Description:** These standalone pages import the app's auth-specific stylesheet and theme switcher, but they do not appear to use auth UI components.
- **Why it matters:** Extra HTTP requests and CSS weight; possible side effects from `auth-styles.css` global rules.

#### 14. `build.js` copies deprecated standalone pages
- **Severity:** Low
- **Files:** `build.js:21-24`, `build-deploy.js:28-29`
- **Description:** Build scripts copy `terms.html`, `login-modern.html`, `arena-core.js`, `arena-redesign.css`, `admin-email-system`, etc.
- **Why it matters:** Increases deployment surface. Some of these files may be unused or superseded by directory-based equivalents.

---

## SaaS-Readiness Gaps Specific to This Domain

| Gap | Current State | Impact for SaaS Launch |
|---|---|---|
| **Brand consistency** | Three visual systems coexist (info-pages.css, styles.css+auth-styles.css, old LMArena pages). | Looks unprofessional; undermines trust. |
| **Social / growth readiness** | No OG image file; OG tags missing on most pages. | Organic sharing will look broken. |
| **Legal compliance** | Legal text mentions analytics, marketing emails, A/B tests, and EU cookie consent; no actual UI for these exists. | Privacy policy / consent gap; enterprise/compliance review will flag. |
| **Orphaned public pages** | Careers, nested duplicates, and old backup directory are public/servable. | SEO confusion, legal risk, larger attack surface. |
| **Navigation architecture** | Header links change per page; leaderboard has two entry points (modal vs page). | Poor UX, harder analytics, SEO dilution. |
| **SEO source of truth** | Two different sitemaps (static file vs worker-generated). | Crawler confusion and audit friction. |
| **Content freshness** | Models page and leaderboard page contain static model claims. | Quickly becomes inaccurate as AI providers ship updates. |

---

## Recommended Fixes / Next Steps (Prioritized by Impact)

### Immediate (blocks production launch)

1. **Create or restore `assets/og-image.png`**
   - Design a 1200x630 brand image with the DualMind logo and tagline.
   - Add `og:image` to `index.html`, `about/index.html`, `faq/index.html`, `how-it-works/index.html`, `models/index.html`, `share/index.html`, `privacy/index.html`, `terms/index.html`, `cookies/index.html`.
   - For pages generated by `worker.js`, add OG meta injection either by rewriting `<head>` placeholders or by making those pages server-rendered.

2. **Remove or rework `/careers/`**
   - Option A: Delete `careers/` entirely, remove it from `sitemap.xml` and `worker.js`, remove it from `build.js` copy list.
   - Option B: Replace with a one-page "No open roles" placeholder that matches `info-pages.css`, remove fake listings, remove all LMArena references, and add a footer link from every info page + the main app settings menu.

3. **Delete legacy duplicate content**
   - Delete `about/about/`, `careers/careers/`, `how-it-works/how-it-works/`.
   - Delete or move `old-html-backup/` out of the repository root.
   - Add `dist/`, `deploy_build/`, and any other build outputs to `.gitignore` and remove from git tracking.

### High priority (week 1 post-launch)

4. **Audit and align legal copy with actual behavior**
   - Remove references to analytics, A/B testing, marketing emails, and language preferences unless they are shipped.
   - Implement a real cookie-consent banner or remove EU-specific consent language.
   - Add a "Data deletion / export" mechanism referenced in the Privacy Policy.

5. **Unify design system for standalone marketing pages**
   - Migrate `leaderboard/index.html`, `models/index.html`, and any future `/careers/` to `info-pages.css` + `Outfit` font.
   - Remove `Inter` font loads from leaderboard and models pages.
   - Ensure all pages use `var(--color-cyan)` and do not hardcode `#4AABC2`.

6. **Decide on a single source of truth for sitemap**
   - Either delete `sitemap.xml` from source and rely fully on `worker.js`, or generate `sitemap.xml` at build time from the same URL list used by `worker.js`.
   - Add `privacy/`, `terms/`, `cookies/`, and `login/` to the source file if it is kept.

7. **Fix `share/index.html` inline styles**
   - Move loading-overlay styles to `shared-thread.css` and use `var(--color-cyan)`.
   - Add OG meta tags for shared threads (dynamic title/description would require worker-level rendering).

### Medium priority (month 1)

8. **Resolve leaderboard dual entry points**
   - Either make the sidebar "Leaderboard" link navigate to `/leaderboard/` and retire the modal, or keep the modal and remove the standalone page from the sitemap.
   - If the standalone page is kept, add a visible "Leaderboard" link in the main app header or footer.

9. **Make `/models/` useful or remove it**
   - Either link `/models/` in the info-page header/footer and dynamically populate model names from the backend, or remove it from the sitemap and builds.

10. **Standardize global footer/header across all static pages**
    - Create a shared header/footer snippet (include via a build/pre-process step or server-side include) so every page has the same links: About, FAQ, How it Works, Leaderboard, Models, Terms, Privacy, Cookies.

### Low priority / cleanup

11. Refactor `404.html` to consume a shared error stylesheet or tokens.
12. Remove unused imports (`auth-styles.css`, `theme.js`) from pages that don't need them after unification.
13. Review `build.js` and `build-deploy.js` for deprecated files (`terms.html`, `login-modern.html`, `arena-core.js`, etc.) and remove from copy lists.
14. Add Playwright tests for all info pages verifying 200 status, canonical link presence, no LMArena strings, and no 404 assets.

---

*Audit completed: 2026-08-14*
