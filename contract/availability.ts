// Which models a visitor can actually meet (cycle 5 P1-1). Pure and shared by the web app and the
// Worker, so the board, the Models page, the landing strip and /leaderboard.md all say the same.
//
// The API's own flags decide as soon as it sends them: `active` (false = the model is gone) and
// `blindEligible` (false = pick-only: it can be chosen in Side by side but is never drawn for a
// blind battle). Until it does, the lists below are the fallback. They come from the cycle 5
// red-team of 26 Nov 2026: Cloudflare's own model pages (15 models no longer in its catalogue),
// the cycle 2 back red-team (Groq and Google deprecation pages), and the Back ModelSelector
// (the `cloudflare` provider is manual-only). Delete an entry when the model comes back, and the
// lists once the API sends the flags for every row.

export type Availability = 'blind' | 'pick-only' | 'retired' | 'not-chat';

/** Ids Groq shut down; matched by the name without its platform prefix (`groq/compound-mini`). */
const RETIRED_BARE_IDS: ReadonlySet<string> = new Set([
  'compound-mini',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'kimi-k2-instruct',
  'kimi-k2-instruct-0905',
]);

/** Full model names (lower case) that are gone from their provider's catalogue. */
const RETIRED_FULL_NAMES: ReadonlySet<string> = new Set([
  // Cloudflare Workers AI: "Model not available ... is deprecated, removed, or not found" on 26 Nov.
  '@cf/meta/llama-3.1-70b-instruct',
  '@cf/meta/llama-3.1-8b-instruct-fast',
  '@hf/meta-llama/meta-llama-3-8b-instruct',
  '@hf/mistral/mistral-7b-instruct-v0.2',
  '@hf/nousresearch/hermes-2-pro-mistral-7b',
  '@cf/meta/llama-3.1-8b-instruct-awq',
  '@cf/meta/llama-3.1-8b-instruct',
  '@cf/mistral/mistral-7b-instruct-v0.1',
  '@cf/meta/llama-3-8b-instruct',
  '@cf/meta/llama-3-8b-instruct-awq',
  '@hf/google/gemma-7b-it',
  '@cf/defog/sqlcoder-7b-2',
  '@cf/meta/llama-2-7b-chat-fp16',
  '@cf/meta/llama-2-7b-chat-int8',
  '@cf/microsoft/phi-2',
  // Groq and Google shutdowns reported by the cycle 2 back red-team from the providers' pages.
  'groq/compound',
  'qwen/qwen3-32b',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
]);

/** Safety classifiers and adapter bases: ranked on the board, but not chat models. */
const NOT_CHAT_RE = /(?:llama-guard|sqlcoder|phi-2)|-lora$/i;

/** Providers the Back ModelSelector never draws for a blind battle (manual-only). */
const PICK_ONLY_PLATFORMS: ReadonlySet<string> = new Set(['cloudflare']);

function bareId(modelName: string): string {
  return (modelName.split('/').pop() ?? modelName).trim().toLowerCase();
}

/** The retired rule alone: the API flag when present, else the named lists. */
export function isRetiredModel(modelName: string, active?: boolean): boolean {
  if (active !== undefined) return !active;
  return RETIRED_BARE_IDS.has(bareId(modelName)) || RETIRED_FULL_NAMES.has(modelName.trim().toLowerCase());
}

export function modelAvailability(model: {
  modelName: string;
  providerName: string;
  active?: boolean | undefined;
  blindEligible?: boolean | undefined;
}): Availability {
  if (isRetiredModel(model.modelName, model.active)) return 'retired';
  if (NOT_CHAT_RE.test(bareId(model.modelName))) return 'not-chat';
  if (model.blindEligible !== undefined) return model.blindEligible ? 'blind' : 'pick-only';
  return PICK_ONLY_PLATFORMS.has(model.providerName.trim().toLowerCase()) ? 'pick-only' : 'blind';
}

/** Words for each state, in one place (badges, the markdown table, the machine-readable copies). */
export const AVAILABILITY_LABEL: Readonly<Record<Availability, string>> = {
  blind: 'in blind battles',
  'pick-only': 'pick-only',
  retired: 'retired',
  'not-chat': 'not a chat model',
};
