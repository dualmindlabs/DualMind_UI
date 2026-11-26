/**
 * Models a visitor can meet in a blind battle, from the public leaderboard as listed on
 * 2026-10-20 and edited on 2026-11-26: models Groq, Google and Cloudflare have since shut down are
 * gone, and so are the Cloudflare models, which are pick-only (never drawn for a blind battle; see
 * contract/availability.ts). Names and providers only, from
 * `GET https://api.dualmindlab.tech/api/arena/model-stats`. The model strip starts with this
 * list so the prerendered page is not empty, labels it with its date, and swaps in the live list
 * as soon as the API answers. No numbers come from here.
 */
export const MODEL_SNAPSHOT_DATE = '26 Nov 2026';

export const MODEL_SNAPSHOT: ReadonlyArray<{ name: string; providerId: string }> = [
  { name: 'Gemma 3n E2B IT', providerId: 'google' },
  { name: 'Gemma 3n E4B IT', providerId: 'google' },
  { name: 'gemini-2.5-pro', providerId: 'google' },
  { name: 'gemma-3-1b-it', providerId: 'google' },
  { name: 'gemma-3-4b-it', providerId: 'google' },
  { name: 'gemini-2.5-flash', providerId: 'google' },
  { name: 'openai/gpt-oss-120b', providerId: 'groq' },
  { name: 'gemma-3-27b-it', providerId: 'google' },
  { name: 'gemma-3-12b-it', providerId: 'google' },
  { name: 'openai/gpt-oss-20b', providerId: 'groq' },
];
