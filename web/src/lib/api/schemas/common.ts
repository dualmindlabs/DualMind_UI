import { z } from 'zod';

/**
 * Building blocks for response schemas that normalise what the API sends today
 * (docs/api/endpoints.md, "Response envelope quirks") into one typed shape:
 * camelCase and snake_case duplicates, `{ items }` or a bare array, numbers sent as strings,
 * null or missing optional fields. Only output types leave this folder.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `eloScore` -> `elo_score`. */
export function toSnakeCase(key: string): string {
  return key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/** The first of `keys` with a value that is not null or undefined. */
export function pickFirst(raw: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

type AliasMap<S extends z.ZodObject> = Partial<
  Record<keyof S['shape'] & string, readonly string[]>
>;

/**
 * Wraps an object schema so each field is read from its camelCase name, then its snake_case
 * name, then any extra aliases (`{ eloScore: ['elo_rating', 'elo'] }`). Unknown keys are dropped
 * by the object schema, so duplicates never reach the app.
 */
export function withAliases<S extends z.ZodObject>(schema: S, aliases: AliasMap<S> = {}) {
  const keys = Object.keys(schema.shape);
  const extra = aliases as Partial<Record<string, readonly string[]>>;
  return z.preprocess((input: unknown) => {
    if (!isRecord(input)) return input;
    const output: Record<string, unknown> = {};
    for (const key of keys) {
      const value = pickFirst(input, [key, toSnakeCase(key), ...(extra[key] ?? [])]);
      if (value !== undefined) output[key] = value;
    }
    return output;
  }, schema);
}

const NUMERIC_STRING = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/;

/** A finite number (zod 4 rejects NaN and Infinity), also accepted as a numeric string ("64.58"). */
export const numeric = z.preprocess(
  (value: unknown) =>
    typeof value === 'string' && NUMERIC_STRING.test(value.trim()) ? Number(value.trim()) : value,
  z.number(),
);

/** A count or score that may be missing: defaults to 0. */
export const count = numeric.optional().transform(value => value ?? 0);

/** A number that may be missing or null: normalised to null. */
export const optionalNumber = numeric.nullish().transform(value => value ?? null);

/** A string that may be missing, null or empty: normalised to null. */
export const optionalString = z
  .string()
  .nullish()
  .transform(value =>
    value === undefined || value === null || value.trim() === '' ? null : value,
  );

/** A boolean, also accepted as "true"/"false" or 1/0; missing means `fallback`. */
export function flag(fallback: boolean) {
  return z
    .preprocess((value: unknown) => {
      if (value === 'true' || value === 1 || value === '1') return true;
      if (value === 'false' || value === 0 || value === '0') return false;
      return value;
    }, z.boolean().optional())
    .transform(value => value ?? fallback);
}

/**
 * A list sent as `{ items: [...] }` (the documented envelope), as a bare array, or wrapped in
 * `{ data: [...] }`. Every item must match; a broken item fails the whole response, so contract
 * drift shows up in tests and logs instead of silently thinning the list.
 */
export function listOf<T extends z.ZodType>(item: T) {
  return z.preprocess((input: unknown): unknown => {
    if (Array.isArray(input)) return input as unknown[];
    if (isRecord(input)) {
      if (Array.isArray(input.items)) return input.items as unknown[];
      if (Array.isArray(input.data)) return input.data as unknown[];
    }
    return input;
  }, z.array(item));
}

/**
 * The `{ success, message }` body of PATCH and DELETE calls and votes. An empty 2xx body (204)
 * counts as success.
 */
export const mutationResultSchema = z.preprocess(
  (input: unknown) => (input === null || input === undefined || input === '' ? {} : input),
  z.object({
    success: flag(true),
    message: optionalString,
  }),
);

export type MutationResult = z.output<typeof mutationResultSchema>;

/** Token usage as sent by the arena routes (camelCase or snake_case). */
export const usageSchema = withAliases(
  z.object({
    promptTokens: count,
    completionTokens: count,
    totalTokens: count,
  }),
);

export type Usage = z.output<typeof usageSchema>;
