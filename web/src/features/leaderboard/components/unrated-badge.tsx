import { Badge } from '@/components/ui/badge';

import { PROVISIONAL_BATTLES } from '../lib/constants';

/**
 * Marks a model with fewer than PROVISIONAL_BATTLES battles: it has no rank yet. The amber dot
 * carries the state for sighted readers; the words, and a hidden explanation for screen readers,
 * carry it for everyone else.
 */
export function UnratedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warn" className={className} data-unrated="">
      Not yet rated
      <span className="sr-only">, fewer than {PROVISIONAL_BATTLES} battles</span>
    </Badge>
  );
}
