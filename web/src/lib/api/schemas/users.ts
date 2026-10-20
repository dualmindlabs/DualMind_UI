import { z } from 'zod';

import { isRecord, optionalNumber, optionalString, withAliases } from './common';

/**
 * The user object from `POST /api/users/sync` (and the planned `GET /api/users/me`). Its shape is
 * not documented (the route is missing from the OpenAPI document), so this reads every variant
 * the legacy client handled: a plain object, `{ user }`, `{ data }`, `{ items: [user] }` or
 * `[user]`, with `user_id`/`userId`/`id` and `energy_balance`/`energyBalance`/`credits`.
 */
function unwrapUser(input: unknown): unknown {
  if (Array.isArray(input)) return input[0] ?? null;
  if (!isRecord(input)) return input;
  if ('role' in input || 'user_id' in input || 'userId' in input) return input;
  if (Array.isArray(input.items)) return input.items[0] ?? null;
  if (Array.isArray(input.data)) return input.data[0] ?? null;
  if (isRecord(input.user)) return input.user;
  if (isRecord(input.data)) return input.data;
  return input;
}

export const userProfileSchema = z.preprocess(
  unwrapUser,
  withAliases(
    z.object({
      userId: optionalString,
      email: optionalString,
      name: optionalString,
      avatarUrl: optionalString,
      role: optionalString,
      energyBalance: optionalNumber.catch(null),
    }),
    {
      userId: ['id'],
      name: ['full_name', 'fullName', 'display_name', 'displayName'],
      role: ['user_role', 'userRole'],
      energyBalance: ['credits', 'credit_balance', 'balance'],
    },
  ),
);

export type UserProfile = z.output<typeof userProfileSchema>;
