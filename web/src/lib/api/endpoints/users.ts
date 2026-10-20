import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { type UserProfile, userProfileSchema } from '../schemas/users';
import { requireText } from './input';

/** The signed-in Supabase user, as the API's `users/sync` expects it. */
export interface UserSyncInput {
  /** Supabase user id. */
  id: string;
  email: string;
  name: string;
  /** Sign-in provider: `email`, `google`, `github`... */
  provider: string;
  phone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
}

export interface UserEndpoints {
  /**
   * `POST /api/users/sync`: creates or updates the `public.users` row of the signed-in user
   * (call after sign-in). An upsert, but a POST, so it is not retried automatically. The body
   * sends `avatar_url` in snake_case because that is what the API reads today.
   */
  syncUser: (input: UserSyncInput, options?: CallOptions) => Promise<UserProfile>;
  /**
   * `GET /api/users/me`. The API answers 404 today (KNOWN_ISSUES N7): this rejects with kind
   * `not_found` until the route exists. `syncUser` returns the same profile meanwhile.
   */
  getMe: (options?: CallOptions) => Promise<UserProfile>;
}

export function createUserEndpoints(transport: Transport): UserEndpoints {
  return {
    syncUser: async (input, options) =>
      await transport.json(
        {
          method: 'POST',
          path: '/api/users/sync',
          auth: 'required',
          body: {
            id: requireText(input.id, 'id'),
            email: input.email,
            phone: input.phone ?? null,
            name: input.name,
            avatar_url: input.avatarUrl ?? null,
            provider: input.provider,
          },
          schema: userProfileSchema,
        },
        options,
      ),

    getMe: options =>
      transport.json(
        { method: 'GET', path: '/api/users/me', auth: 'required', schema: userProfileSchema },
        options,
      ),
  };
}
