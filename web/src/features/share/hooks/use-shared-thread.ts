import { useQuery } from '@tanstack/react-query';

import { useApiClient } from '@/hooks/use-api-client';
import { isApiErrorKind, sharedThreadQuery } from '@/lib/api';

/**
 * The shared thread as any visitor sees it (no token; `getSharedThread`). One attempt at the query
 * level: the transport already retries a dropped connection twice, and a private or missing
 * thread answers at once instead of after a series of retries.
 */
export function useSharedThread(threadId: string | null) {
  const api = useApiClient();
  const query = useQuery({
    ...sharedThreadQuery(api, threadId ?? ''),
    enabled: threadId !== null,
    retry: false,
  });
  // Private, deleted or never there: the API answers 401, 403 or 404 (400 for a malformed id).
  const unavailable =
    threadId === null ||
    (query.isError && isApiErrorKind(query.error, 'auth', 'forbidden', 'not_found', 'validation'));
  return { query, unavailable };
}
