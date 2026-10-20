import { ApiError } from '../errors';

/**
 * Local checks of caller input, so an obviously invalid call fails before it costs a request
 * (and, for battles, provider quota). They throw a `validation` ApiError with code
 * `INVALID_ARGUMENT`; the API stays the authority on everything else.
 */

function invalid(message: string): ApiError {
  return new ApiError({ kind: 'validation', code: 'INVALID_ARGUMENT', message });
}

/** A string with at least one non-space character. Returns it unchanged (prompts keep spacing). */
export function requireText(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalid(`${name} must not be empty`);
  }
  return value;
}

export function optionalPositiveInt(value: unknown, name: string, max: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw invalid(`${name} must be a whole number from 1 to ${max}`);
  }
  return value;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], name: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw invalid(`${name} must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

/** Drops undefined values, so request bodies only carry what the caller set. */
export function compact<T extends Record<string, unknown>>(body: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
