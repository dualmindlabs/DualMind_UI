/**
 * The rating threshold: a model with fewer battles than this is "Not yet rated": it is listed in
 * its own group without a rank, and never reaches the podium or the landing page's top five.
 * Below it, a handful of votes can still move the rating a long way, so a rank would claim more
 * than the data says. The number is the owner's call (Harsh's): 5 keeps the rank honest at the very bottom while
 * still ranking nearly the whole board (on 2026-10-21, 49 of the 53 models had at least 5
 * battles); revisit it when confidence intervals arrive from the API (backend roadmap BE-9)
 * and the board can show real uncertainty instead.
 */
export const PROVISIONAL_BATTLES = 5;

/** The provider filter's "every provider" value. */
export const ALL_PROVIDERS = 'all';

/** How often an open board asks for fresh numbers (only while the tab is visible). */
export const REFRESH_INTERVAL_MS = 60_000;

/** The Elo explanation on the How it works page (features/info, section "rating"). */
export const RATINGS_HELP_HREF = '/how-it-works/#rating';

/** Where a visitor starts a battle. */
export const ARENA_HREF = '/';

/** The podium shows the first three models. */
export const PODIUM_SIZE = 3;

/**
 * The share of the inline Elo bar the lowest-rated model still gets, so its bar never vanishes:
 * bars run from this floor (the lowest rating) to full width (the highest).
 */
export const ELO_BAR_FLOOR = 0.06;
