/**
 * Models that are still on the board but can no longer be met in a battle. The API's `active`
 * flag decides when it sends one (`active: false` retires, `active: true` keeps); until it does,
 * this list names the ones the 26 Nov 2026 red-team found: Groq shut these models down. Delete an
 * entry when the model comes back, and the whole list once the API sends `active` for every row.
 */
const RETIRED_MODEL_IDS: ReadonlySet<string> = new Set([
  'compound-mini',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'kimi-k2-instruct',
  'kimi-k2-instruct-0905',
]);

/** The model id without its platform prefix ("groq/compound-mini" -> "compound-mini"). */
function bareId(modelName: string): string {
  return (modelName.split('/').pop() ?? modelName).trim().toLowerCase();
}

export function isRetiredModel(modelName: string, active?: boolean): boolean {
  if (active !== undefined) return !active;
  return RETIRED_MODEL_IDS.has(bareId(modelName));
}
