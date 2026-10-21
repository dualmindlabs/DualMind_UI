import { Badge } from '@/components/ui/badge';

import { PROVISIONAL_BATTLES } from '../lib/constants';

/**
 * Marks a model with fewer than PROVISIONAL_BATTLES battles. The amber dot carries the state for
 * sighted readers; the word itself, and a hidden explanation for screen readers, carry it for
 * everyone else.
 */
export function ProvisionalBadge({ className }: { className?: string }) {
  return (
    <Badge variant="warn" className={className} data-provisional="">
      Provisional
      <span className="sr-only">, fewer than {PROVISIONAL_BATTLES} battles</span>
    </Badge>
  );
}
