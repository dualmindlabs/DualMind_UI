/**
 * Models that are still on the board but can no longer be met in a battle. The API's `active`
 * flag decides when it sends one (`active: false` retires, `active: true` keeps); until it does,
 * this list names the ones the providers have switched off. Checked on 26 Nov 2026 against
 * https://console.groq.com/docs/deprecations and https://aistudio.google.com/docs/deprecations.
 * Delete an entry when the model comes back, and the whole list once the API sends `active` for
 * every row.
 *
 * An entry with a date counts as retired from that day on (UTC), so the list can be written ahead
 * of an announced retirement without hiding the model early.
 */
const RETIRED_MODELS: ReadonlyMap<string, string | null> = new Map<string, string | null>([
  // Groq, already retired (the date in the comment is the retirement date).
  ['kimi-k2-instruct', null], // 2025-10-10
  ['kimi-k2-instruct-0905', null], // 2026-04-15
  ['llama-4-maverick-17b-128e-instruct', null], // 2026-03-09
  ['llama-4-scout-17b-16e-instruct', null], // 2026-07-17
  ['qwen3-32b', null], // 2026-07-17
  ['llama-3.1-8b-instant', null], // 2026-08-16
  ['llama-3.3-70b-versatile', null], // 2026-08-16
  ['compound', null], // 2026-09-21
  ['compound-mini', null], // 2026-09-21
  // Gemini 2.5 pair: Google routes both away from 1 Dec 2026. gemini-2.5-flash-lite is not retired.
  ['gemini-2.5-pro', '2026-12-01'],
  ['gemini-2.5-flash', '2026-12-01'],
]);

/** The model id without its platform prefix ("groq/compound-mini" -> "compound-mini"). */
function bareId(modelName: string): string {
  return (modelName.split('/').pop() ?? modelName).trim().toLowerCase();
}

export function isRetiredModel(
  modelName: string,
  active?: boolean,
  now: Date = new Date(),
): boolean {
  if (active !== undefined) return !active;
  const id = bareId(modelName);
  if (!RETIRED_MODELS.has(id)) return false;
  const from = RETIRED_MODELS.get(id);
  return from === null || from === undefined || now.getTime() >= Date.parse(`${from}T00:00:00Z`);
}
