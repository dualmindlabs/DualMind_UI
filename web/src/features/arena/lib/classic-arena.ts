import { ARENA_CHOICE_KEY, LEGACY_APP_PATH } from '@/lib/session/handoff';

/**
 * The way back to the classic (legacy) arena while both exist: remembers the choice, so `/`
 * hands this browser to the legacy app again, and goes there. `?arena=new` on `/` comes back.
 */
export function leaveForClassicArena(): void {
  try {
    window.localStorage.setItem(ARENA_CHOICE_KEY, 'legacy');
  } catch {
    // Blocked storage: the classic arena still opens; `/` may show the new arena again.
  }
  window.location.assign(LEGACY_APP_PATH);
}
