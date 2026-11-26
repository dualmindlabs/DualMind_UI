/**
 * Models that are still on the board but can no longer be met in a battle. The API's `active`
 * flag decides when it sends one (`active: false` retires, `active: true` keeps); until it does,
 * the shared list in contract/availability.ts names the ones the 26 Nov 2026 red-team found.
 */
export { isRetiredModel } from '@contract/availability';
